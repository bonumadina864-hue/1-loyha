import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';

export class UpdateSettingsDto {
  @IsOptional()
  @IsBoolean()
  biometricEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  biometricFallbackDeviceCred?: boolean;

  @IsOptional()
  @IsBoolean()
  purgeEnabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(3)
  @Max(10)
  purgeMaxAttempts?: number;

  @IsOptional()
  @IsInt()
  @IsIn([0, 30, 60, 300])
  autoLockTimerSeconds?: number;

  @IsOptional()
  @IsString()
  @IsIn(['generic', 'silent'])
  notificationStyle?: 'generic' | 'silent';

  @IsOptional()
  @IsBoolean()
  readSpoofingEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  screenshotBlockingEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  intruderAlertEnabled?: boolean;

  @IsOptional()
  @IsString()
  @IsIn(['en', 'uz', 'ru'])
  language?: 'en' | 'uz' | 'ru';

  @IsOptional()
  @IsString()
  @IsIn(['dark', 'light', 'system'])
  theme?: 'dark' | 'light' | 'system';
}

export class BlockUserDto {
  @IsString()
  @IsNotEmpty()
  userId!: string;
}

export class CreateReportDto {
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @IsOptional()
  @IsString()
  pairId?: string;

  @IsString()
  @IsNotEmpty()
  @Length(10, 2000)
  reason!: string;
}

export class DeleteAccountDto {
  @IsString()
  @IsNotEmpty()
  password!: string;
}
