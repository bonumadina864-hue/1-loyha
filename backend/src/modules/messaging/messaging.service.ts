import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Message,
  MessageReceipt,
  Pair,
  UserSettings,
  MessageType,
} from '../../database/entities';
import { CryptoService } from '../crypto/crypto.service';
import { PairingService } from '../pairing/pairing.service';

export interface DecryptedMessage {
  id: string;
  pairId: string;
  senderId: string;
  messageType: MessageType;
  content: string;
  replyToId: string | null;
  deliveredAt: Date | null;
  readAt: Date | null;
  createdAt: Date;
}

@Injectable()
export class MessagingService {
  private readonly logger = new Logger(MessagingService.name);

  constructor(
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    @InjectRepository(MessageReceipt)
    private readonly receiptRepository: Repository<MessageReceipt>,
    @InjectRepository(Pair)
    private readonly pairRepository: Repository<Pair>,
    @InjectRepository(UserSettings)
    private readonly settingsRepository: Repository<UserSettings>,
    private readonly cryptoService: CryptoService,
    private readonly pairingService: PairingService,
  ) {}

  /**
   * Encrypts and stores a new message, creating an initial unread receipt.
   */
  async sendMessage(
    senderId: string,
    pairId: string,
    type: MessageType,
    plainContent: string,
    replyToId?: string,
  ): Promise<{ message: Message; recipientId: string; decryptedContent: string }> {
    const pair = await this.pairRepository.findOne({ where: { id: pairId } });
    if (!pair || pair.status !== 'active') {
      throw new ForbiddenException('Cannot send message to an inactive or non-existent pair');
    }

    if (pair.userAId !== senderId && pair.userBId !== senderId) {
      throw new ForbiddenException('You are not a member of this pair');
    }

    const recipientId = pair.userAId === senderId ? pair.userBId : pair.userAId;

    // Get unwrapped pair DEK
    const dek = await this.pairingService.getPairDek(pairId);

    // Encrypt content with AES-256-GCM
    const encrypted = this.cryptoService.encryptMessage(plainContent, dek);

    const message = this.messageRepository.create({
      pairId,
      senderId,
      messageType: type,
      encryptedContent: encrypted.cipherText,
      encryptionIv: encrypted.iv,
      encryptionTag: encrypted.tag,
      replyToId: replyToId || null,
    });

    const savedMessage = await this.messageRepository.save(message);

    // Create receipt
    const receipt = this.receiptRepository.create({
      messageId: savedMessage.id,
      recipientId,
    });
    await this.receiptRepository.save(receipt);

    // Update pair message count and activity
    pair.messageCount = Number(pair.messageCount) + 1;
    pair.lastActivity = new Date();
    await this.pairRepository.save(pair);

    return {
      message: savedMessage,
      recipientId,
      decryptedContent: plainContent,
    };
  }

  /**
   * Mark message as delivered.
   */
  async markDelivered(messageId: string, recipientId: string): Promise<Date> {
    const receipt = await this.receiptRepository.findOne({
      where: { messageId, recipientId },
    });

    if (receipt && !receipt.deliveredAt) {
      receipt.deliveredAt = new Date();
      await this.receiptRepository.save(receipt);
      return receipt.deliveredAt;
    }

    return receipt?.deliveredAt || new Date();
  }

  /**
   * Mark message as read, with premium Unread Status Spoofing support.
   */
  async markRead(
    messageId: string,
    readerId: string,
  ): Promise<{ shouldNotifySender: boolean; readAt: Date; pairId: string; senderId: string }> {
    const receipt = await this.receiptRepository.findOne({
      where: { messageId, recipientId: readerId },
      relations: ['message'],
    });

    if (!receipt) {
      throw new NotFoundException('Receipt not found');
    }

    const message = receipt.message;
    const settings = await this.settingsRepository.findOne({
      where: { userId: readerId },
    });

    const readAt = new Date();
    receipt.readAt = readAt;

    // Premium read spoofing check
    if (settings?.readSpoofingEnabled) {
      receipt.readSpoofed = true;
      await this.receiptRepository.save(receipt);
      return {
        shouldNotifySender: false,
        readAt,
        pairId: message.pairId,
        senderId: message.senderId,
      };
    }

    await this.receiptRepository.save(receipt);
    return {
      shouldNotifySender: true,
      readAt,
      pairId: message.pairId,
      senderId: message.senderId,
    };
  }

  /**
   * Premium: Release all withheld read receipts for a pair.
   */
  async releaseSpoofedReads(
    userId: string,
    pairId: string,
  ): Promise<{ releasedCount: number; partnerId: string; releasedReceipts: { messageId: string; readAt: Date }[] }> {
    const pair = await this.pairRepository.findOne({ where: { id: pairId } });
    if (!pair || (pair.userAId !== userId && pair.userBId !== userId)) {
      throw new ForbiddenException('Invalid pair');
    }

    const partnerId = pair.userAId === userId ? pair.userBId : pair.userAId;

    const spoofed = await this.receiptRepository
      .createQueryBuilder('receipt')
      .innerJoin('receipt.message', 'msg')
      .where('msg.pairId = :pairId', { pairId })
      .andWhere('receipt.recipientId = :userId', { userId })
      .andWhere('receipt.readSpoofed = true')
      .andWhere('receipt.spoofedReleasedAt IS NULL')
      .getMany();

    const now = new Date();
    for (const r of spoofed) {
      r.spoofedReleasedAt = now;
      await this.receiptRepository.save(r);
    }

    return {
      releasedCount: spoofed.length,
      partnerId,
      releasedReceipts: spoofed.map((s) => ({
        messageId: s.messageId,
        readAt: s.readAt || now,
      })),
    };
  }

  /**
   * Paginated REST sync for messages in a pair.
   */
  async getMessages(
    userId: string,
    pairId: string,
    beforeId?: string,
    limit = 50,
  ): Promise<{ messages: DecryptedMessage[]; hasMore: boolean }> {
    const pair = await this.pairRepository.findOne({ where: { id: pairId } });
    if (!pair || (pair.userAId !== userId && pair.userBId !== userId)) {
      throw new ForbiddenException('Access denied to pair messages');
    }

    const dek = await this.pairingService.getPairDek(pairId);

    const qb = this.messageRepository
      .createQueryBuilder('msg')
      .leftJoinAndSelect('msg.receipts', 'receipt')
      .where('msg.pairId = :pairId', { pairId })
      .andWhere('msg.isDeleted = false')
      .orderBy('msg.createdAt', 'DESC')
      .take(limit + 1);

    if (beforeId) {
      const target = await this.messageRepository.findOne({ where: { id: beforeId } });
      if (target) {
        qb.andWhere('msg.createdAt < :createdAt', { createdAt: target.createdAt });
      }
    }

    const rawMessages = await qb.getMany();
    const hasMore = rawMessages.length > limit;
    const paged = rawMessages.slice(0, limit);

    const decrypted: DecryptedMessage[] = paged.map((m) => {
      let content = '[Encrypted Message]';
      try {
        content = this.cryptoService.decryptMessage(
          m.encryptedContent,
          dek,
          m.encryptionIv,
          m.encryptionTag,
        );
      } catch (err: any) {
        this.logger.error(`Failed to decrypt message ${m.id}: ${err.message}`);
      }

      const receipt = m.receipts?.[0];
      return {
        id: m.id,
        pairId: m.pairId,
        senderId: m.senderId,
        messageType: m.messageType,
        content,
        replyToId: m.replyToId,
        deliveredAt: receipt?.deliveredAt || null,
        readAt: receipt?.readAt || null,
        createdAt: m.createdAt,
      };
    });

    return {
      messages: decrypted.reverse(),
      hasMore,
    };
  }
}
