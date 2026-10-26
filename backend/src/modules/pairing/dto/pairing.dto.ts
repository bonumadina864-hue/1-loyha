import { IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';

export class SendPairRequestDto {
  @IsString()
  @IsNotEmpty()
  @Length(10, 10, { message: 'Public ID must be exactly 10 characters Crockford Base32' })
  toPublicId!: string;
}

export class AcceptPairRequestDto {
  @IsString()
  @IsOptional()
  @Length(1, 100)
  nickname?: string;
}

export class UpdateNicknameDto {
  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  nickname!: string;
}
