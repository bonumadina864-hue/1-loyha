import { IsEmail, IsNotEmpty, IsString, Length, IsIn, IsOptional } from 'class-validator';

export class AdminLoginDto {
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;
}

export class VerifyTotpDto {
  @IsString()
  @IsNotEmpty()
  tempToken!: string;

  @IsString()
  @Length(6, 6)
  totpCode!: string;
}

export class ReviewTicketDto {
  @IsString()
  @IsNotEmpty()
  @Length(5, 1000)
  note!: string;
}

export class CreateAdminDto {
  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  fullName!: string;

  @IsString()
  @IsIn(['SUPER_ADMIN', 'SUPPORT'])
  role!: 'SUPER_ADMIN' | 'SUPPORT';

  @IsString()
  @Length(8, 128)
  password!: string;
}

export class UpdateAdminDto {
  @IsOptional()
  @IsIn(['SUPER_ADMIN', 'SUPPORT'])
  role?: 'SUPER_ADMIN' | 'SUPPORT';

  @IsOptional()
  isActive?: boolean;
}

export class ReviewReportDto {
  @IsString()
  @IsIn(['reviewed', 'actioned', 'dismissed'])
  status!: 'reviewed' | 'actioned' | 'dismissed';

  @IsString()
  @IsOptional()
  note?: string;
}
