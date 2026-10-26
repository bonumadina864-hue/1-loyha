import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import {
  RestorationTicket,
  Pair,
  Message,
  AdminAuditLog,
  AdminUser,
} from '../../database/entities';
import { PairingService } from '../pairing/pairing.service';
import { CryptoService } from '../crypto/crypto.service';
import { MessagingGateway } from '../messaging/messaging.gateway';
import { ConfigService } from '@nestjs/config';

export interface CreateTicketDto {
  pairId: string;
  reason: string;
  timeRangeStart?: string;
  timeRangeEnd?: string;
}

@Injectable()
export class ArchiveService {
  private readonly logger = new Logger(ArchiveService.name);

  constructor(
    @InjectRepository(RestorationTicket)
    private readonly ticketRepository: Repository<RestorationTicket>,
    @InjectRepository(Pair)
    private readonly pairRepository: Repository<Pair>,
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    @InjectRepository(AdminAuditLog)
    private readonly auditRepository: Repository<AdminAuditLog>,
    @InjectRepository(AdminUser)
    private readonly adminRepository: Repository<AdminUser>,
    private readonly pairingService: PairingService,
    private readonly cryptoService: CryptoService,
    private readonly messagingGateway: MessagingGateway,
    private readonly configService: ConfigService,
  ) {}

  /**
   * User submits a restoration ticket after local biometric purge or device reset.
   */
  async createTicket(userId: string, dto: CreateTicketDto): Promise<RestorationTicket> {
    const pair = await this.pairRepository.findOne({ where: { id: dto.pairId } });
    if (!pair || (pair.userAId !== userId && pair.userBId !== userId)) {
      throw new ForbiddenException('Invalid pair for restoration');
    }

    if (!dto.reason || dto.reason.trim().length < 10) {
      throw new BadRequestException('Restoration reason must be at least 10 characters');
    }

    // Check rate limit: max 3 tickets per user per 24 hours
    const count24h = await this.ticketRepository
      .createQueryBuilder('ticket')
      .where('ticket.userId = :userId', { userId })
      .andWhere("ticket.createdAt > NOW() - INTERVAL '24 hours'")
      .getCount();

    if (count24h >= 3) {
      throw new ForbiddenException(
        'Ticket submission limit reached (max 3 tickets per 24 hours). Please wait.',
      );
    }

    const ticket = this.ticketRepository.create({
      userId,
      pairId: dto.pairId,
      status: 'pending',
      reason: dto.reason.trim(),
      timeRangeStart: dto.timeRangeStart ? new Date(dto.timeRangeStart) : null,
      timeRangeEnd: dto.timeRangeEnd ? new Date(dto.timeRangeEnd) : null,
      restoreProgress: { total: 0, delivered: 0, lastMessageId: null },
    });

    return this.ticketRepository.save(ticket);
  }

  async getUserTickets(userId: string): Promise<RestorationTicket[]> {
    return this.ticketRepository.find({
      where: { userId },
      relations: ['pair'],
      order: { createdAt: 'DESC' },
    });
  }

  async getTicketById(userId: string, ticketId: string): Promise<RestorationTicket> {
    const ticket = await this.ticketRepository.findOne({
      where: { id: ticketId, userId },
      relations: ['pair'],
    });
    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }
    return ticket;
  }

  /**
   * Admin approves a ticket with mandatory note.
   * If REQUIRE_DUAL_APPROVAL is true and this is the first approver, remains pending until second approver signs off.
   */
  async approveTicket(
    adminId: string,
    ticketId: string,
    note: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<RestorationTicket> {
    const ticket = await this.ticketRepository.findOne({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException('Ticket not found');

    if (!note || note.trim().length < 5) {
      throw new BadRequestException('Approval note is mandatory (min 5 chars)');
    }

    const requireDual =
      this.configService.get<string>('REQUIRE_DUAL_APPROVAL') === 'true';

    if (requireDual && !ticket.reviewedBy) {
      ticket.reviewedBy = adminId;
      ticket.reviewNote = `First approval by Admin: ${note.trim()}`;
      ticket.reviewedAt = new Date();
      await this.ticketRepository.save(ticket);

      await this.writeAuditLog(
        adminId,
        'APPROVE_TICKET_STEP1',
        'restoration_ticket',
        ticket.id,
        ticket.id,
        note,
        { step: 1, requiredApprovals: 2 },
        ipAddress,
        userAgent,
      );
      return ticket;
    }

    if (requireDual && ticket.reviewedBy) {
      if (ticket.reviewedBy === adminId) {
        throw new BadRequestException('Second approver must be a different administrator');
      }
      ticket.secondApproverId = adminId;
      ticket.reviewNote = `${ticket.reviewNote} | Second approval by Admin: ${note.trim()}`;
    } else {
      ticket.reviewedBy = adminId;
      ticket.reviewNote = note.trim();
    }

    ticket.status = 'approved';
    ticket.reviewedAt = new Date();
    const saved = await this.ticketRepository.save(ticket);

    await this.writeAuditLog(
      adminId,
      'APPROVE_TICKET_FINAL',
      'restoration_ticket',
      ticket.id,
      ticket.id,
      note,
      { dualApproval: requireDual },
      ipAddress,
      userAgent,
    );

    return saved;
  }

  /**
   * Admin rejects a ticket with mandatory note.
   */
  async rejectTicket(
    adminId: string,
    ticketId: string,
    note: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<RestorationTicket> {
    const ticket = await this.ticketRepository.findOne({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException('Ticket not found');

    if (!note || note.trim().length < 5) {
      throw new BadRequestException('Rejection note is mandatory');
    }

    ticket.status = 'rejected';
    ticket.reviewedBy = adminId;
    ticket.reviewNote = note.trim();
    ticket.reviewedAt = new Date();

    const saved = await this.ticketRepository.save(ticket);

    await this.writeAuditLog(
      adminId,
      'REJECT_TICKET',
      'restoration_ticket',
      ticket.id,
      ticket.id,
      note,
      null,
      ipAddress,
      userAgent,
    );

    return saved;
  }

  /**
   * Re-delivers archived messages to the requesting user over Socket.io and updates ticket progress.
   */
  async executeRestoration(
    adminId: string,
    ticketId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ delivered: number; total: number }> {
    const ticket = await this.ticketRepository.findOne({
      where: { id: ticketId, status: 'approved' },
      relations: ['pair'],
    });

    if (!ticket) {
      throw new BadRequestException('Ticket must be in approved status to restore');
    }

    const dek = await this.pairingService.getPairDek(ticket.pairId);

    // Build message query according to optional time ranges
    const qb = this.messageRepository
      .createQueryBuilder('msg')
      .where('msg.pairId = :pairId', { pairId: ticket.pairId })
      .andWhere('msg.isDeleted = false')
      .orderBy('msg.createdAt', 'ASC');

    if (ticket.timeRangeStart) {
      qb.andWhere('msg.createdAt >= :start', { start: ticket.timeRangeStart });
    }
    if (ticket.timeRangeEnd) {
      qb.andWhere('msg.createdAt <= :end', { end: ticket.timeRangeEnd });
    }

    const messages = await qb.getMany();
    const total = messages.length;

    // Batch decrypt and deliver
    const batchSize = 50;
    let delivered = 0;

    for (let i = 0; i < messages.length; i += batchSize) {
      const batch = messages.slice(i, i + batchSize);
      const decryptedBatch = batch.map((m) => {
        let content = '';
        try {
          content = this.cryptoService.decryptMessage(
            m.encryptedContent,
            dek,
            m.encryptionIv,
            m.encryptionTag,
          );
        } catch {
          content = '[Encrypted Archive]';
        }
        return {
          id: m.id,
          pairId: m.pairId,
          senderId: m.senderId,
          type: m.messageType,
          content,
          replyToId: m.replyToId,
          createdAt: m.createdAt,
        };
      });

      // Stream to user room via Socket.io
      this.messagingGateway.server
        .to(`user:${ticket.userId}`)
        .emit('restore:message', {
          ticketId: ticket.id,
          batchIndex: Math.floor(i / batchSize),
          messages: decryptedBatch,
        });

      delivered += batch.length;

      this.messagingGateway.server
        .to(`user:${ticket.userId}`)
        .emit('restore:progress', {
          ticketId: ticket.id,
          total,
          delivered,
          lastMessageId: batch[batch.length - 1].id,
        });
    }

    ticket.status = 'completed';
    ticket.restoredAt = new Date();
    ticket.restoreProgress = {
      total,
      delivered,
      lastMessageId: messages[messages.length - 1]?.id || null,
    };
    await this.ticketRepository.save(ticket);

    this.messagingGateway.server
      .to(`user:${ticket.userId}`)
      .emit('restore:complete', { ticketId: ticket.id, totalDelivered: delivered });

    // Write immutable audit log
    await this.writeAuditLog(
      adminId,
      'RESTORE_CHAT_EXECUTE',
      'pair_messages',
      ticket.pairId,
      ticket.id,
      `Delivered ${delivered} archived messages to user ${ticket.userId}`,
      { totalRestored: delivered, ticketId: ticket.id },
      ipAddress,
      userAgent,
    );

    return { delivered, total };
  }

  private async writeAuditLog(
    adminId: string,
    action: string,
    resourceType: string,
    resourceId: string | null,
    ticketId: string | null,
    reason: string | null,
    metadata: Record<string, unknown> | null,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const log = this.auditRepository.create({
      adminId,
      action,
      resourceType,
      resourceId,
      ticketId,
      reason,
      metadata,
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
    });
    await this.auditRepository.save(log);
  }
}
