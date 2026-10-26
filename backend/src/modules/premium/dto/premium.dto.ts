import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class VerifyReceiptDto {
  @IsString()
  @IsIn(['ios', 'android'])
  platform!: 'ios' | 'android';

  @IsString()
  @IsNotEmpty()
  receipt!: string;

  @IsString()
  @IsNotEmpty()
  productId!: string;
}

export class RestorePurchasesDto {
  @IsString()
  @IsIn(['ios', 'android'])
  platform!: 'ios' | 'android';

  @IsString()
  @IsNotEmpty()
  receipt!: string;
}

export class UploadCloudBackupDto {
  @IsString()
  @IsNotEmpty()
  encryptedBlobUrl!: string;

  @IsString()
  @IsNotEmpty()
  argon2SaltHex!: string;

  @IsOptional()
  blobSizeBytes?: number;

  @IsOptional()
  messageCount?: number;
}
