import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  UseGuards,
  Req,
  Param,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { VerifyEmailDto, VerifyPhoneDto } from './dto/verify.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: RefreshDto) {
    return this.authService.refreshTokens(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@CurrentUser() user: JwtPayload, @Req() req: any) {
    const token = req.headers.authorization?.replace('Bearer ', '');
    await this.authService.logout(user.sub, user.deviceId, token);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logoutAll(@CurrentUser() user: JwtPayload, @Req() req: any) {
    const token = req.headers.authorization?.replace('Bearer ', '');
    await this.authService.logoutAll(user.sub, token);
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    const verified = await this.authService.verifyEmail(dto.email, dto.code);
    if (!verified) throw new BadRequestException('Invalid email verification code');
    return { verified: true };
  }

  @Post('verify-phone')
  @HttpCode(HttpStatus.OK)
  async verifyPhone(@Body() dto: VerifyPhoneDto) {
    const verified = await this.authService.verifyPhone(dto.phone, dto.code);
    if (!verified) throw new BadRequestException('Invalid phone verification code');
    return { verified: true };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@CurrentUser('sub') userId: string) {
    return { userId };
  }

  @UseGuards(JwtAuthGuard)
  @Get('devices')
  async listDevices(@CurrentUser('sub') userId: string) {
    return this.authService.getUserDevices(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('devices/:deviceId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokeDevice(
    @CurrentUser('sub') userId: string,
    @Param('deviceId') deviceId: string,
  ) {
    await this.authService.revokeDevice(userId, deviceId);
  }
}
