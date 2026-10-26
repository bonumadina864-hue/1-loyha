import { Controller, Post, Body, HttpCode, HttpStatus, ForbiddenException, Inject, forwardRef } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';

import { IsEmail, IsOptional, IsString } from 'class-validator';

export class DevLoginDto {
  @IsOptional()
  @IsString()
  @IsEmail()
  email?: string;
}

@Controller('auth')
export class DevLoginController {
  constructor(
    @Inject(forwardRef(() => AuthService))
    private readonly authService: AuthService,
  ) {}

  @Post('dev-login')
  @HttpCode(HttpStatus.OK)
  async devLogin(@Body() dto: DevLoginDto) {
    if (process.env.NODE_ENV === 'production' || process.env.ENABLE_DEV_LOGIN !== 'true') {
      throw new ForbiddenException('Dev login is physically disabled in production builds');
    }
    const email = dto?.email || 'dev@pairly.local';
    return this.authService.devLogin(email);
  }
}
