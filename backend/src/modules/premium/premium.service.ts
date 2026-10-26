import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subscription, CloudBackup, Pair } from '../../database/entities';
import { MockRevenueCatService } from './billing/mock-revenuecat.service';
import {
  VerifyReceiptDto,
  RestorePurchasesDto,
  UploadCloudBackupDto,
} from './dto/premium.dto';

@Injectable()
export class PremiumService {
  private readonly logger = new Logger(PremiumService.name);

  constructor(
    @InjectRepository(Subscription)
    private readonly subscriptionRepository: Repository<Subscription>,
    @InjectRepository(CloudBackup)
    private readonly backupRepository: Repository<CloudBackup>,
    @InjectRepository(Pair)
    private readonly pairRepository: Repository<Pair>,
    private readonly billingProvider: MockRevenueCatService,
  ) {}

  async getSubscription(userId: string): Promise<Subscription> {
    let sub = await this.subscriptionRepository.findOne({ where: { userId } });
    if (!sub) {
      sub = this.subscriptionRepository.create({
        userId,
        tier: 'free',
        status: 'active',
      });
      sub = await this.subscriptionRepository.save(sub);
    }
    return sub;
  }

  async verifyReceipt(userId: string, dto: VerifyReceiptDto): Promise<Subscription> {
    const verification = await this.billingProvider.verifyReceipt(
      dto.platform,
      dto.receipt,
      dto.productId,
    );

    if (!verification.isValid) {
      throw new BadRequestException('Invalid store purchase receipt');
    }

    let sub = await this.subscriptionRepository.findOne({ where: { userId } });
    if (!sub) {
      sub = this.subscriptionRepository.create({ userId });
    }

    sub.tier = verification.tier;
    sub.status = verification.status;
    sub.storeProductId = verification.productId;
    sub.storeTransactionId = verification.transactionId;
    sub.startsAt = new Date();
    sub.expiresAt = verification.expiresAt;
    sub.gracePeriodEndsAt = verification.gracePeriodEndsAt;

    return this.subscriptionRepository.save(sub);
  }

  async restorePurchases(userId: string, dto: RestorePurchasesDto): Promise<Subscription> {
    const verification = await this.billingProvider.restorePurchases(
      dto.platform,
      dto.receipt,
    );

    if (!verification.isValid) {
      throw new NotFoundException('No previous purchases found for this account');
    }

    let sub = await this.subscriptionRepository.findOne({ where: { userId } });
    if (!sub) {
      sub = this.subscriptionRepository.create({ userId });
    }

    sub.tier = verification.tier;
    sub.status = verification.status;
    sub.storeProductId = verification.productId;
    sub.storeTransactionId = verification.transactionId;
    sub.expiresAt = verification.expiresAt;
    sub.gracePeriodEndsAt = verification.gracePeriodEndsAt;

    return this.subscriptionRepository.save(sub);
  }

  // --- Zero-Knowledge Cloud Backup (Zero Admin Access) ---

  async uploadBackup(
    userId: string,
    pairId: string,
    dto: UploadCloudBackupDto,
  ): Promise<CloudBackup> {
    const pair = await this.pairRepository.findOne({ where: { id: pairId } });
    if (!pair || (pair.userAId !== userId && pair.userBId !== userId)) {
      throw new BadRequestException('Invalid pair for backup');
    }

    // Determine latest backup version
    const latest = await this.backupRepository.findOne({
      where: { userId, pairId },
      order: { backupVersion: 'DESC' },
    });

    const nextVersion = latest ? latest.backupVersion + 1 : 1;

    const backup = this.backupRepository.create({
      userId,
      pairId,
      encryptedBlobUrl: dto.encryptedBlobUrl,
      argon2Salt: Buffer.from(dto.argon2SaltHex, 'hex'),
      blobSizeBytes: dto.blobSizeBytes || 0,
      messageCount: dto.messageCount || 0,
      backupVersion: nextVersion,
    });

    return this.backupRepository.save(backup);
  }

  async listBackups(userId: string, pairId: string): Promise<CloudBackup[]> {
    return this.backupRepository.find({
      where: { userId, pairId },
      order: { backupVersion: 'DESC' },
    });
  }

  async getBackup(userId: string, pairId: string, version: number): Promise<CloudBackup> {
    const backup = await this.backupRepository.findOne({
      where: { userId, pairId, backupVersion: version },
    });
    if (!backup) throw new NotFoundException('Cloud backup not found');
    return backup;
  }

  async deleteBackup(userId: string, pairId: string, version: number): Promise<void> {
    await this.backupRepository.delete({
      userId,
      pairId,
      backupVersion: version,
    });
  }
}
