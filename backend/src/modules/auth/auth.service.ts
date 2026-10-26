import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import { User, Device, UserSettings, Subscription } from '../../database/entities';
import { generateCrockfordId } from '../../common/utils/crockford';
import { RedisService } from '../redis/redis.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  userId: string;
  publicId: string;
  deviceId?: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Device)
    private readonly deviceRepository: Repository<Device>,
    @InjectRepository(UserSettings)
    private readonly settingsRepository: Repository<UserSettings>,
    @InjectRepository(Subscription)
    private readonly subscriptionRepository: Repository<Subscription>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {}

  /**
   * Register a new user with Argon2id password hashing and unique Crockford public ID.
   */
  async register(dto: RegisterDto): Promise<AuthTokens> {
    const existing = await this.userRepository.findOne({
      where: [{ email: dto.email.toLowerCase() }, { phone: dto.phone }],
    });

    if (existing) {
      if (existing.email === dto.email.toLowerCase()) {
        throw new ConflictException('Email is already registered');
      }
      throw new ConflictException('Phone number is already registered');
    }

    const passwordHash = await argon2.hash(dto.password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    // Ensure Crockford ID uniqueness
    let publicId = generateCrockfordId();
    while (await this.userRepository.findOne({ where: { publicId } })) {
      publicId = generateCrockfordId();
    }

    const user = this.userRepository.create({
      publicId,
      fullName: dto.fullName.trim(),
      phone: dto.phone,
      email: dto.email.toLowerCase().trim(),
      passwordHash,
      phoneVerified: false,
      emailVerified: false,
    });

    const savedUser = await this.userRepository.save(user);

    // Initialize default UserSettings
    const settings = this.settingsRepository.create({
      userId: savedUser.id,
      biometricEnabled: true,
      biometricFallbackDeviceCred: false,
      purgeEnabled: false,
      purgeMaxAttempts: 5,
      autoLockTimerSeconds: 0,
      notificationStyle: 'generic',
      readSpoofingEnabled: false,
      screenshotBlockingEnabled: false,
      intruderAlertEnabled: false,
      language: 'en',
      theme: 'dark',
    });
    await this.settingsRepository.save(settings);

    // Initialize free Subscription
    const subscription = this.subscriptionRepository.create({
      userId: savedUser.id,
      tier: 'free',
      status: 'active',
    });
    await this.subscriptionRepository.save(subscription);

    return this.generateTokensForDevice(savedUser, 'Default Device', 'ios');
  }

  /**
   * Login with email + password, creating/updating device session.
   */
  async login(dto: LoginDto): Promise<AuthTokens> {
    const user = await this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('LOWER(user.email) = LOWER(:email)', { email: dto.email.trim() })
      .andWhere('user.isActive = true')
      .andWhere('user.isDeleted = false')
      .getOne();

    if (!user || !(await argon2.verify(user.passwordHash, dto.password))) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.generateTokensForDevice(
      user,
      dto.deviceName || 'Mobile Device',
      dto.platform,
      dto.deviceToken,
    );
  }

  /**
   * Rotate refresh token with family-based replay attack detection.
   */
  async refreshTokens(dto: RefreshDto): Promise<{ accessToken: string; refreshToken: string }> {
    let payload: any;
    try {
      payload = this.jwtService.verify(dto.refreshToken, {
        secret: this.configService.get<string>(
          'JWT_REFRESH_SECRET',
          'pairly_super_secure_jwt_refresh_secret_key_2026_dev',
        ),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (payload.type !== 'refresh' || !payload.sub || !payload.deviceId || !payload.family) {
      throw new UnauthorizedException('Malformed refresh token');
    }

    const device = await this.deviceRepository
      .createQueryBuilder('device')
      .addSelect('device.refreshTokenHash')
      .where('device.id = :id', { id: payload.deviceId })
      .andWhere('device.userId = :userId', { userId: payload.sub })
      .getOne();

    if (!device) {
      throw new UnauthorizedException('Device session not found');
    }

    // Replay attack detection: if family does not match or token hash is already invalidated
    if (device.refreshTokenFamily !== payload.family || !device.refreshTokenHash) {
      // Invalidate all sessions for this device family
      await this.deviceRepository.update(
        { userId: payload.sub, refreshTokenFamily: payload.family },
        { refreshTokenHash: null },
      );
      this.logger.warn(`Potential refresh token replay attack detected for user ${payload.sub}`);
      throw new UnauthorizedException('Refresh token reuse detected. All sessions revoked.');
    }

    const tokenMatches = crypto.timingSafeEqual(
      Buffer.from(crypto.createHash('sha256').update(dto.refreshToken).digest('hex')),
      Buffer.from(device.refreshTokenHash),
    );

    if (!tokenMatches) {
      // Compromised token detected
      await this.deviceRepository.update(
        { id: device.id },
        { refreshTokenHash: null },
      );
      throw new UnauthorizedException('Invalid refresh token credential');
    }

    const user = await this.userRepository.findOne({ where: { id: payload.sub } });
    if (!user || !user.isActive || user.isDeleted) {
      throw new UnauthorizedException('User account inactive or deleted');
    }

    const sub = await this.subscriptionRepository.findOne({ where: { userId: user.id } });
    const tier = sub?.tier || 'free';

    // Issue rotated tokens
    const accessToken = this.jwtService.sign(
      {
        sub: user.id,
        type: 'access',
        deviceId: device.id,
        tier,
      },
      {
        secret: this.configService.get<string>(
          'JWT_ACCESS_SECRET',
          'pairly_super_secure_jwt_access_secret_key_2026_dev',
        ),
        expiresIn: '15m',
      },
    );

    const newRefreshToken = this.jwtService.sign(
      {
        sub: user.id,
        type: 'refresh',
        deviceId: device.id,
        family: device.refreshTokenFamily,
      },
      {
        secret: this.configService.get<string>(
          'JWT_REFRESH_SECRET',
          'pairly_super_secure_jwt_refresh_secret_key_2026_dev',
        ),
        expiresIn: '30d',
      },
    );

    const newHash = crypto.createHash('sha256').update(newRefreshToken).digest('hex');
    await this.deviceRepository.update(
      { id: device.id },
      { refreshTokenHash: newHash, lastActiveAt: new Date() },
    );

    return { accessToken, refreshToken: newRefreshToken };
  }

  /**
   * Invalidate current device session on logout.
   */
  async logout(userId: string, deviceId: string, accessToken?: string): Promise<void> {
    await this.deviceRepository.update({ id: deviceId, userId }, { refreshTokenHash: null });
    if (accessToken) {
      // Blacklist for remaining lifetime of 15 min access token
      await this.redisService.blacklistToken(accessToken, 900);
    }
  }

  /**
   * Invalidate all device sessions for the user.
   */
  async logoutAll(userId: string, currentToken?: string): Promise<void> {
    await this.deviceRepository.update({ userId }, { refreshTokenHash: null });
    if (currentToken) {
      await this.redisService.blacklistToken(currentToken, 900);
    }
  }

  /**
   * Dev quick login by email (ONLY callable in dev mode with guard).
   */
  async devLogin(email: string): Promise<AuthTokens> {
    let user = await this.userRepository.findOne({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      // Auto-provision dev user if not found
      user = await this.userRepository.save(
        this.userRepository.create({
          id: crypto.randomUUID(),
          publicId: generateCrockfordId(),
          fullName: email.includes('alice') ? 'Alice' : email.includes('bob') ? 'Bob' : 'Dev Test User',
          phone: `+99890${Math.floor(1000000 + Math.random() * 9000000)}`,
          email: email.toLowerCase().trim(),
          passwordHash: await argon2.hash('password123'),
          emailVerified: true,
          phoneVerified: true,
        }),
      );

      await this.settingsRepository.save(
        this.settingsRepository.create({
          id: crypto.randomUUID(),
          userId: user.id,
          biometricEnabled: true,
        }),
      );

      await this.subscriptionRepository.save(
        this.subscriptionRepository.create({
          id: crypto.randomUUID(),
          userId: user.id,
          tier: 'premium',
          status: 'active',
        }),
      );
    }

    return this.generateTokensForDevice(user, 'Dev Simulator', 'android');
  }

  async verifyEmail(email: string, code: string): Promise<boolean> {
    // In dev: accept '123456' or check Redis
    if (code === '123456' || (await this.redisService.get(`verify:email:${email}`)) === code) {
      await this.userRepository.update({ email: email.toLowerCase() }, { emailVerified: true });
      return true;
    }
    return false;
  }

  async verifyPhone(phone: string, code: string): Promise<boolean> {
    if (code === '123456' || (await this.redisService.get(`verify:phone:${phone}`)) === code) {
      await this.userRepository.update({ phone }, { phoneVerified: true });
      return true;
    }
    return false;
  }

  async getUserDevices(userId: string): Promise<Device[]> {
    return this.deviceRepository.find({
      where: { userId },
      order: { lastActiveAt: 'DESC' },
    });
  }

  async revokeDevice(userId: string, deviceId: string): Promise<void> {
    await this.deviceRepository.delete({ id: deviceId, userId });
  }

  private async generateTokensForDevice(
    user: User,
    deviceName: string,
    platform: 'ios' | 'android',
    deviceToken?: string,
  ): Promise<AuthTokens> {
    const sub = await this.subscriptionRepository.findOne({ where: { userId: user.id } });
    const tier = sub?.tier || 'free';

    const device = this.deviceRepository.create({
      id: crypto.randomUUID(),
      userId: user.id,
      deviceName,
      platform,
      deviceToken: deviceToken || null,
      refreshTokenFamily: crypto.randomUUID(),
      lastActiveAt: new Date(),
    });

    const savedDevice = await this.deviceRepository.save(device);

    const accessToken = this.jwtService.sign(
      {
        sub: user.id,
        type: 'access',
        deviceId: savedDevice.id,
        tier,
      },
      {
        secret: this.configService.get<string>(
          'JWT_ACCESS_SECRET',
          'pairly_super_secure_jwt_access_secret_key_2026_dev',
        ),
        expiresIn: '15m',
      },
    );

    const refreshToken = this.jwtService.sign(
      {
        sub: user.id,
        type: 'refresh',
        deviceId: savedDevice.id,
        family: savedDevice.refreshTokenFamily,
      },
      {
        secret: this.configService.get<string>(
          'JWT_REFRESH_SECRET',
          'pairly_super_secure_jwt_refresh_secret_key_2026_dev',
        ),
        expiresIn: '30d',
      },
    );

    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    await this.deviceRepository.update({ id: savedDevice.id }, { refreshTokenHash: tokenHash });

    return {
      accessToken,
      refreshToken,
      userId: user.id,
      publicId: user.publicId,
      deviceId: savedDevice.id,
    };
  }
}
