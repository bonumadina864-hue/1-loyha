import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as argon2 from 'argon2';
import {
  User,
  UserSettings,
  Block,
  Report,
  Device,
  Pair,
} from '../../database/entities';
import {
  UpdateSettingsDto,
  CreateReportDto,
  DeleteAccountDto,
} from './dto/settings.dto';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);

  constructor(
    @InjectRepository(UserSettings)
    private readonly settingsRepository: Repository<UserSettings>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Block)
    private readonly blockRepository: Repository<Block>,
    @InjectRepository(Report)
    private readonly reportRepository: Repository<Report>,
    @InjectRepository(Device)
    private readonly deviceRepository: Repository<Device>,
    @InjectRepository(Pair)
    private readonly pairRepository: Repository<Pair>,
    private readonly redisService: RedisService,
  ) {}

  async getSettings(userId: string): Promise<UserSettings> {
    let settings = await this.settingsRepository.findOne({ where: { userId } });
    if (!settings) {
      settings = this.settingsRepository.create({ userId });
      settings = await this.settingsRepository.save(settings);
    }
    return settings;
  }

  async updateSettings(userId: string, dto: UpdateSettingsDto): Promise<UserSettings> {
    let settings = await this.settingsRepository.findOne({ where: { userId } });
    if (!settings) {
      settings = this.settingsRepository.create({ userId });
    }

    Object.assign(settings, dto);
    return this.settingsRepository.save(settings);
  }

  // --- Blocking & Reporting ---

  async blockUser(blockerId: string, blockedId: string): Promise<Block> {
    if (blockerId === blockedId) {
      throw new BadRequestException('Cannot block yourself');
    }

    const existing = await this.blockRepository.findOne({
      where: { blockerId, blockedId },
    });
    if (existing) return existing;

    const block = this.blockRepository.create({ blockerId, blockedId });
    return this.blockRepository.save(block);
  }

  async unblockUser(blockerId: string, blockedId: string): Promise<void> {
    await this.blockRepository.delete({ blockerId, blockedId });
  }

  async getBlockedUsers(userId: string) {
    const blocks = await this.blockRepository.find({
      where: { blockerId: userId },
      relations: ['blocked'],
    });

    return blocks.map((b) => ({
      userId: b.blocked.id,
      publicId: b.blocked.publicId,
      fullName: b.blocked.fullName,
      avatarUrl: b.blocked.avatarUrl,
      blockedAt: b.createdAt,
    }));
  }

  async reportUser(reporterId: string, dto: CreateReportDto): Promise<Report> {
    if (reporterId === dto.userId) {
      throw new BadRequestException('Cannot report yourself');
    }

    const report = this.reportRepository.create({
      reporterId,
      reportedUserId: dto.userId,
      pairId: dto.pairId || null,
      reason: dto.reason.trim(),
      status: 'pending',
    });

    return this.reportRepository.save(report);
  }

  // --- Account Deletion & GDPR Export ---

  async deleteAccount(userId: string, dto: DeleteAccountDto): Promise<void> {
    const user = await this.userRepository
      .createQueryBuilder('u')
      .addSelect('u.passwordHash')
      .where('u.id = :id', { id: userId })
      .getOne();

    if (!user) throw new NotFoundException('User not found');

    const isValid = await argon2.verify(user.passwordHash, dto.password);
    if (!isValid) {
      throw new UnauthorizedException('Incorrect password. Account deletion aborted.');
    }

    user.isActive = false;
    user.isDeleted = true;
    user.deletedAt = new Date();
    await this.userRepository.save(user);

    // Revoke all device sessions
    await this.deviceRepository.delete({ userId });

    this.logger.log(`Account ${userId} deleted. 30-day purge grace initiated.`);
  }

  async exportUserData(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['devices', 'settings', 'subscription'],
    });

    if (!user) throw new NotFoundException('User not found');

    const pairs = await this.pairRepository.find({
      where: [{ userAId: userId }, { userBId: userId }],
    });

    return {
      profile: {
        id: user.id,
        publicId: user.publicId,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        createdAt: user.createdAt,
      },
      settings: user.settings,
      subscription: user.subscription,
      devices: user.devices.map((d) => ({
        deviceName: d.deviceName,
        platform: d.platform,
        createdAt: d.createdAt,
        lastActiveAt: d.lastActiveAt,
      })),
      pairsCount: pairs.length,
      exportTimestamp: new Date().toISOString(),
    };
  }
}
