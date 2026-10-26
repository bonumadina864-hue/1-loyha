import { Injectable, Logger } from '@nestjs/common';
import {
  BillingProvider,
  ReceiptVerificationResult,
} from './billing.provider.interface';

@Injectable()
export class MockRevenueCatService implements BillingProvider {
  private readonly logger = new Logger(MockRevenueCatService.name);

  async verifyReceipt(
    platform: 'ios' | 'android',
    receiptData: string,
    productId: string,
  ): Promise<ReceiptVerificationResult> {
    this.logger.log(
      `Mock billing verification for ${platform} product ${productId}`,
    );

    // Sandbox / dev mock: all receipts prefixed or ending with 'invalid' are rejected
    if (receiptData === 'invalid_receipt') {
      return {
        isValid: false,
        tier: 'free',
        status: 'expired',
        productId,
        transactionId: '',
        expiresAt: null,
        gracePeriodEndsAt: null,
      };
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30-day subscription

    const gracePeriodEndsAt = new Date(expiresAt);
    gracePeriodEndsAt.setDate(gracePeriodEndsAt.getDate() + 3); // 3-day grace period

    return {
      isValid: true,
      tier: 'premium',
      status: 'active',
      productId: productId || 'pairly_premium_monthly',
      transactionId: `mock_tx_${Date.now()}`,
      expiresAt,
      gracePeriodEndsAt,
    };
  }

  async restorePurchases(
    platform: 'ios' | 'android',
    receiptData: string,
  ): Promise<ReceiptVerificationResult> {
    return this.verifyReceipt(platform, receiptData, 'pairly_premium_monthly');
  }
}
