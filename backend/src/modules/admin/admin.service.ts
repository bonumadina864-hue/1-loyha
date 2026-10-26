import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { authenticator } from 'otplib';
import {
  AdminUser,
  AdminAuditLog,
  User,
  Pair,
  Message,
  RestorationTicket,
  Subscription,
  Report,
} from '../../database/entities';
import {
  AdminLoginDto,
  VerifyTotpDto,
  CreateAdminDto,
  UpdateAdminDto,
  ReviewReportDto,
} from './dto/admin.dto';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    @InjectRepository(AdminUser)
    private readonly adminRepository: Repository<AdminUser>,
    @InjectRepository(AdminAuditLog)
    private readonly auditRepository: Repository<AdminAuditLog>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Pair)
    private readonly pairRepository: Repository<Pair>,
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    @InjectRepository(RestorationTicket)
    private readonly ticketRepository: Repository<RestorationTicket>,
    @InjectRepository(Subscription)
    private readonly subscriptionRepository: Repository<Subscription>,
    @InjectRepository(Report)
    private readonly reportRepository: Repository<Report>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * First step of Admin Login: verify credentials, return temp token for TOTP verification.
   */
  async login(dto: AdminLoginDto): Promise<{ tempToken?: string; accessToken?: string; requiresTotp: boolean }> {
    let admin = await this.adminRepository
      .createQueryBuilder('admin')
      .addSelect('admin.passwordHash')
      .addSelect('admin.totpSecretEnc')
      .where('LOWER(admin.email) = LOWER(:email)', { email: dto.email.trim() })
      .andWhere('admin.isActive = true')
      .getOne();

    // Auto-seed default SUPER_ADMIN in development if table is empty
    if (!admin && (await this.adminRepository.count()) === 0) {
      const defaultHash = await argon2.hash('admin123456');
      admin = this.adminRepository.create({
        email: 'admin@pairly.local',
        fullName: 'Pairly Super Administrator',
        role: 'SUPER_ADMIN',
        passwordHash: defaultHash,
        totpEnabled: false,
        isActive: true,
      });
      await this.adminRepository.save(admin);
      this.logger.log('Seeded initial SUPER_ADMIN account: admin@pairly.local / admin123456');
    }

    if (!admin || !(await argon2.verify(admin.passwordHash, dto.password))) {
      throw new UnauthorizedException('Invalid admin credentials');
    }

    if (admin.totpEnabled && admin.totpSecretEnc) {
      const tempToken = this.jwtService.sign(
        { sub: admin.id, type: 'admin_totp_pending' },
        { expiresIn: '5m' },
      );
      return { tempToken, requiresTotp: true };
    }

    // Direct issue if TOTP is not yet enabled
    const accessToken = this.jwtService.sign(
      {
        sub: admin.id,
        email: admin.email,
        role: admin.role,
        type: 'admin_access',
      },
      { expiresIn: '8h' },
    );

    return { accessToken, requiresTotp: false };
  }

  /**
   * Step 2: Verify TOTP 2FA code.
   */
  async verifyTotp(dto: VerifyTotpDto): Promise<{ accessToken: string }> {
    let payload: any;
    try {
      payload = this.jwtService.verify(dto.tempToken);
    } catch {
      throw new UnauthorizedException('Expired or invalid 2FA session');
    }

    if (payload.type !== 'admin_totp_pending') {
      throw new UnauthorizedException('Invalid 2FA token type');
    }

    const admin = await this.adminRepository
      .createQueryBuilder('admin')
      .addSelect('admin.totpSecretEnc')
      .where('admin.id = :id', { id: payload.sub })
      .getOne();

    if (!admin || !admin.totpSecretEnc) {
      throw new UnauthorizedException('TOTP not configured');
    }

    const isValid = authenticator.verify({
      token: dto.totpCode,
      secret: admin.totpSecretEnc,
    });

    if (!isValid) {
      throw new UnauthorizedException('Invalid 2FA verification code');
    }

    const accessToken = this.jwtService.sign(
      {
        sub: admin.id,
        email: admin.email,
        role: admin.role,
        type: 'admin_access',
      },
      { expiresIn: '8h' },
    );

    return { accessToken };
  }

  /**
   * Aggregated KPIs for Admin Dashboard.
   */
  async getDashboardKpis() {
    const [
      totalUsers,
      activePairs,
      pendingTickets,
      totalMessages,
      premiumSubscriptions,
      pendingReports,
    ] = await Promise.all([
      this.userRepository.count({ where: { isActive: true, isDeleted: false } }),
      this.pairRepository.count({ where: { status: 'active' } }),
      this.ticketRepository.count({ where: { status: 'pending' } }),
      this.messageRepository.count(),
      this.subscriptionRepository.count({ where: { tier: 'premium', status: 'active' } }),
      this.reportRepository.count({ where: { status: 'pending' } }),
    ]);

    // Messages sent today
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const messagesToday = await this.messageRepository
      .createQueryBuilder('m')
      .where('m.createdAt >= :start', { start: startOfToday })
      .getCount();

    return {
      kpis: {
        totalUsers,
        activePairs,
        pendingTickets,
        totalMessages,
        messagesToday,
        premiumSubscriptions,
        pendingReports,
      },
    };
  }

  /**
   * Pairs table for admin (STRICT PRIVACY: metadata only, message count, NO message content!).
   */
  async getPairs(page = 1, limit = 20, status?: string) {
    const qb = this.pairRepository
      .createQueryBuilder('pair')
      .leftJoinAndSelect('pair.userA', 'userA')
      .leftJoinAndSelect('pair.userB', 'userB')
      .orderBy('pair.lastActivity', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (status) {
      qb.where('pair.status = :status', { status });
    }

    const [items, total] = await qb.getManyAndCount();

    const formatted = items.map((p) => ({
      pairId: p.id,
      userA: {
        id: p.userA.id,
        publicId: p.userA.publicId,
        fullName: p.userA.fullName,
      },
      userB: {
        id: p.userB.id,
        publicId: p.userB.publicId,
        fullName: p.userB.fullName,
      },
      messageCount: Number(p.messageCount),
      status: p.status,
      lastActivity: p.lastActivity,
      createdAt: p.createdAt,
    }));

    return {
      items: formatted,
      meta: { page, limit, total },
    };
  }

  /**
   * List tickets with pagination and status filtering.
   */
  async getTickets(page = 1, limit = 20, status?: string) {
    const qb = this.ticketRepository
      .createQueryBuilder('ticket')
      .leftJoinAndSelect('ticket.user', 'user')
      .leftJoinAndSelect('ticket.pair', 'pair')
      .leftJoinAndSelect('ticket.reviewer', 'reviewer')
      .orderBy('ticket.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (status) {
      qb.where('ticket.status = :status', { status });
    }

    const [items, total] = await qb.getManyAndCount();
    return { items, meta: { page, limit, total } };
  }

  async getTicketDetail(id: string) {
    const ticket = await this.ticketRepository.findOne({
      where: { id },
      relations: ['user', 'pair', 'reviewer', 'secondApprover'],
    });
    if (!ticket) throw new NotFoundException('Ticket not found');
    return ticket;
  }

  /**
   * Query immutable admin audit logs (SUPER_ADMIN only).
   */
  async getAuditLogs(page = 1, limit = 50, adminId?: string, action?: string) {
    const qb = this.auditRepository
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.admin', 'admin')
      .orderBy('log.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (adminId) qb.andWhere('log.adminId = :adminId', { adminId });
    if (action) qb.andWhere('log.action = :action', { action });

    const [items, total] = await qb.getManyAndCount();
    return { items, meta: { page, limit, total } };
  }

  /**
   * Create new administrator (SUPER_ADMIN only).
   */
  async createAdmin(dto: CreateAdminDto): Promise<AdminUser> {
    const existing = await this.adminRepository.findOne({
      where: { email: dto.email.toLowerCase().trim() },
    });
    if (existing) throw new BadRequestException('Admin email already registered');

    const passwordHash = await argon2.hash(dto.password);
    const admin = this.adminRepository.create({
      email: dto.email.toLowerCase().trim(),
      fullName: dto.fullName.trim(),
      role: dto.role,
      passwordHash,
      totpEnabled: false,
      isActive: true,
    });
    return this.adminRepository.save(admin);
  }

  async listAdmins(): Promise<AdminUser[]> {
    return this.adminRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async updateAdmin(id: string, dto: UpdateAdminDto): Promise<AdminUser> {
    const admin = await this.adminRepository.findOne({ where: { id } });
    if (!admin) throw new NotFoundException('Admin user not found');

    if (dto.role) admin.role = dto.role;
    if (dto.isActive !== undefined) admin.isActive = dto.isActive;

    return this.adminRepository.save(admin);
  }

  /**
   * List and moderate user reports.
   */
  async getReports(page = 1, limit = 20, status?: string) {
    const qb = this.reportRepository
      .createQueryBuilder('rep')
      .leftJoinAndSelect('rep.reporter', 'reporter')
      .leftJoinAndSelect('rep.reportedUser', 'reported')
      .orderBy('rep.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (status) qb.where('rep.status = :status', { status });

    const [items, total] = await qb.getManyAndCount();
    return { items, meta: { page, limit, total } };
  }

  async reviewReport(adminId: string, id: string, dto: ReviewReportDto): Promise<Report> {
    const report = await this.reportRepository.findOne({ where: { id } });
    if (!report) throw new NotFoundException('Report not found');

    report.status = dto.status;
    report.reviewedBy = adminId;
    report.reviewNote = dto.note || null;
    report.reviewedAt = new Date();

    return this.reportRepository.save(report);
  }
}
