export interface ReceiptVerificationResult {
  isValid: boolean;
  tier: 'free' | 'premium';
  status: 'active' | 'expired' | 'cancelled' | 'grace_period';
  productId: string;
  transactionId: string;
  expiresAt: Date | null;
  gracePeriodEndsAt: Date | null;
}

export interface BillingProvider {
  verifyReceipt(
    platform: 'ios' | 'android',
    receiptData: string,
    productId: string,
  ): Promise<ReceiptVerificationResult>;

  restorePurchases(
    platform: 'ios' | 'android',
    receiptData: string,
  ): Promise<ReceiptVerificationResult>;
}
