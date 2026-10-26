import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  User,
  Pair,
  PairRequest,
  PairEncryptionKey,
  Block,
  MessageReceipt,
} from '../../database/entities';
import { CryptoService } from '../crypto/crypto.service';
import { RedisService } from '../redis/redis.service';
import { isValidCrockfordId } from '../../common/utils/crockford';

export interface PairSummary {
  pairId: string;
  partnerId: string;
  partnerPublicId: string;
  partnerNickname: string;
  partnerAvatarUrl: string | null;
  unreadCount: number;
  lastActivity: Date;
  status: 'active' | 'unpaired' | 'blocked';
}

@Injectable()
export class PairingService {
  private readonly logger = new Logger(PairingService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Pair)
    private readonly pairRepository: Repository<Pair>,
    @InjectRepository(PairRequest)
    private readonly requestRepository: Repository<PairRequest>,
    @InjectRepository(PairEncryptionKey)
    private readonly keyRepository: Repository<PairEncryptionKey>,
    @InjectRepository(Block)
    private readonly blockRepository: Repository<Block>,
    @InjectRepository(MessageReceipt)
    private readonly receiptRepository: Repository<MessageReceipt>,
    private readonly cryptoService: CryptoService,
    private readonly redisService: RedisService,
  ) {}

  /**
   * Rate-limited user lookup by public ID (10/min per user).
   * Prevents user enumeration.
   */
  async lookupByPublicId(
    requesterId: string,
    publicId: string,
  ): Promise<{ publicId: string; fullName: string; avatarUrl: string | null }> {
    if (!isValidCrockfordId(publicId)) {
      throw new BadRequestException('Invalid Public ID format');
    }

    const rateKey = `ratelimit:lookup:${requesterId}`;
    const countStr = await this.redisService.get(rateKey);
    const count = countStr ? parseInt(countStr, 10) : 0;
    if (count >= 10) {
      throw new ForbiddenException(
        'Too many lookups. Rate limit exceeded (10 requests per minute).',
      );
    }
    await this.redisService.set(rateKey, (count + 1).toString(), 60);

    const user = await this.userRepository.findOne({
      where: { publicId: publicId.toUpperCase(), isActive: true, isDeleted: false },
    });

    if (!user || user.id === requesterId) {
      throw new NotFoundException('User with specified ID not found');
    }

    // Check if requester is blocked by or has blocked the target
    const isBlocked = await this.blockRepository.findOne({
      where: [
        { blockerId: requesterId, blockedId: user.id },
        { blockerId: user.id, blockedId: requesterId },
      ],
    });

    if (isBlocked) {
      throw new NotFoundException('User with specified ID not found');
    }

    return {
      publicId: user.publicId,
      fullName: user.fullName,
      avatarUrl: user.avatarUrl,
    };
  }

  /**
   * Send a 1-on-1 pair connection request.
   */
  async sendRequest(fromUserId: string, toPublicId: string): Promise<{ requestId: string; status: string }> {
    const targetUser = await this.userRepository.findOne({
      where: { publicId: toPublicId.toUpperCase(), isActive: true, isDeleted: false },
    });

    if (!targetUser) {
      throw new NotFoundException('Target user not found');
    }

    if (targetUser.id === fromUserId) {
      throw new BadRequestException('Cannot pair with yourself');
    }

    // Check block list
    const isBlocked = await this.blockRepository.findOne({
      where: [
        { blockerId: fromUserId, blockedId: targetUser.id },
        { blockerId: targetUser.id, blockedId: fromUserId },
      ],
    });
    if (isBlocked) {
      throw new BadRequestException('Cannot request pair with this user');
    }

    // Check if pair already exists
    const [userAId, userBId] = fromUserId < targetUser.id ? [fromUserId, targetUser.id] : [targetUser.id, fromUserId];
    const existingPair = await this.pairRepository.findOne({
      where: { userAId, userBId },
    });

    if (existingPair && existingPair.status === 'active') {
      throw new ConflictException('You are already paired with this user');
    }

    // Check if pending request exists
    const existingRequest = await this.requestRepository.findOne({
      where: [
        { fromUserId, toUserId: targetUser.id, status: 'pending' },
        { fromUserId: targetUser.id, toUserId: fromUserId, status: 'pending' },
      ],
    });

    if (existingRequest) {
      throw new ConflictException('A pair request is already pending between both users');
    }

    const request = this.requestRepository.create({
      fromUserId,
      toUserId: targetUser.id,
      status: 'pending',
    });

    const saved = await this.requestRepository.save(request);
    return { requestId: saved.id, status: 'pending' };
  }

  /**
   * Accept an incoming pair request and generate envelope encryption DEK.
   */
  async acceptRequest(
    userId: string,
    requestId: string,
    nickname?: string,
  ): Promise<{ pairId: string }> {
    const request = await this.requestRepository.findOne({
      where: { id: requestId, toUserId: userId, status: 'pending' },
    });

    if (!request) {
      throw new NotFoundException('Pending pair request not found');
    }

    if (new Date() > request.expiresAt) {
      request.status = 'expired';
      await this.requestRepository.save(request);
      throw new BadRequestException('This pair request has expired');
    }

    // Canonical ordering: userA < userB
    const [userAId, userBId] =
      request.fromUserId < request.toUserId
        ? [request.fromUserId, request.toUserId]
        : [request.toUserId, request.fromUserId];

    let pair = await this.pairRepository.findOne({
      where: { userAId, userBId },
    });

    if (!pair) {
      pair = this.pairRepository.create({
        userAId,
        userBId,
        status: 'active',
        userANickname: userAId === userId ? nickname || null : null,
        userBNickname: userBId === userId ? nickname || null : null,
      });
      pair = await this.pairRepository.save(pair);

      // Generate DEK and wrap with master KEK
      const dek = this.cryptoService.generateDek();
      const wrapped = this.cryptoService.wrapDek(dek);

      const encryptionKey = this.keyRepository.create({
        pairId: pair.id,
        encryptedDek: wrapped.wrappedKey,
        iv: wrapped.iv,
        tag: wrapped.tag,
        dekVersion: 1,
        kekId: wrapped.kekId,
      });
      await this.keyRepository.save(encryptionKey);
    } else {
      pair.status = 'active';
      if (userAId === userId && nickname) pair.userANickname = nickname;
      if (userBId === userId && nickname) pair.userBNickname = nickname;
      await this.pairRepository.save(pair);
    }

    request.status = 'accepted';
    request.respondedAt = new Date();
    await this.requestRepository.save(request);

    return { pairId: pair.id };
  }

  /**
   * Decline an incoming pair request.
   */
  async declineRequest(userId: string, requestId: string): Promise<void> {
    const request = await this.requestRepository.findOne({
      where: { id: requestId, toUserId: userId, status: 'pending' },
    });
    if (!request) {
      throw new NotFoundException('Pending pair request not found');
    }
    request.status = 'declined';
    request.respondedAt = new Date();
    await this.requestRepository.save(request);
  }

  /**
   * List pending incoming requests for user.
   */
  async getPendingRequests(userId: string) {
    const requests = await this.requestRepository.find({
      where: { toUserId: userId, status: 'pending' },
      relations: ['fromUser'],
      order: { createdAt: 'DESC' },
    });

    return requests.map((req) => ({
      requestId: req.id,
      fromUser: {
        publicId: req.fromUser.publicId,
        fullName: req.fromUser.fullName,
        avatarUrl: req.fromUser.avatarUrl,
      },
      createdAt: req.createdAt,
      expiresAt: req.expiresAt,
    }));
  }

  /**
   * List active pairs for user (Strict privacy: nickname, avatar, unread badge count, last activity ONLY.
   * NO message preview text!).
   */
  async getPairs(userId: string): Promise<PairSummary[]> {
    const pairs = await this.pairRepository
      .createQueryBuilder('pair')
      .leftJoinAndSelect('pair.userA', 'userA')
      .leftJoinAndSelect('pair.userB', 'userB')
      .where('(pair.userAId = :userId OR pair.userBId = :userId)', { userId })
      .andWhere('pair.status = :status', { status: 'active' })
      .orderBy('pair.lastActivity', 'DESC')
      .getMany();

    const result: PairSummary[] = [];

    for (const pair of pairs) {
      const isUserA = pair.userAId === userId;
      const partner = isUserA ? pair.userB : pair.userA;
      const customNickname = isUserA ? pair.userANickname : pair.userBNickname;
      const displayName = customNickname || partner.fullName;

      // Calculate unread count for user in this pair
      const unreadCount = await this.receiptRepository
        .createQueryBuilder('receipt')
        .innerJoin('receipt.message', 'msg')
        .where('msg.pairId = :pairId', { pairId: pair.id })
        .andWhere('receipt.recipientId = :userId', { userId })
        .andWhere('receipt.readAt IS NULL')
        .getCount();

      result.push({
        pairId: pair.id,
        partnerId: partner.id,
        partnerPublicId: partner.publicId,
        partnerNickname: displayName,
        partnerAvatarUrl: partner.avatarUrl,
        unreadCount,
        lastActivity: pair.lastActivity,
        status: pair.status,
      });
    }

    return result;
  }

  /**
   * Update local partner nickname.
   */
  async updateNickname(userId: string, pairId: string, nickname: string): Promise<void> {
    const pair = await this.pairRepository.findOne({ where: { id: pairId } });
    if (!pair || (pair.userAId !== userId && pair.userBId !== userId)) {
      throw new NotFoundException('Pair not found');
    }

    if (pair.userAId === userId) {
      pair.userANickname = nickname.trim();
    } else {
      pair.userBNickname = nickname.trim();
    }

    await this.pairRepository.save(pair);
  }

  /**
   * Unpair a connection.
   */
  async unpair(userId: string, pairId: string): Promise<void> {
    const pair = await this.pairRepository.findOne({ where: { id: pairId } });
    if (!pair || (pair.userAId !== userId && pair.userBId !== userId)) {
      throw new NotFoundException('Pair not found');
    }

    pair.status = 'unpaired';
    await this.pairRepository.save(pair);
  }

  /**
   * Resolves and unwraps the DEK for a pair.
   */
  async getPairDek(pairId: string): Promise<Buffer> {
    const cacheKey = `pair:dek:${pairId}`;
    const cachedHex = await this.redisService.get(cacheKey);
    if (cachedHex) {
      return Buffer.from(cachedHex, 'hex');
    }

    const keyRecord = await this.keyRepository.findOne({ where: { pairId } });
    if (!keyRecord) {
      throw new NotFoundException('Pair encryption key not found');
    }

    const dek = this.cryptoService.unwrapDek(
      keyRecord.encryptedDek,
      keyRecord.iv,
      keyRecord.tag,
    );

    // Cache DEK in Redis with 5 min TTL
    await this.redisService.set(cacheKey, dek.toString('hex'), 300);
    return dek;
  }
}
