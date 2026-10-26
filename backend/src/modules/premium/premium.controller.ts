import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
} from '@nestjs/common';
import { PremiumService } from './premium.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RequirePremiumGuard } from './guards/require-premium.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  VerifyReceiptDto,
  RestorePurchasesDto,
  UploadCloudBackupDto,
} from './dto/premium.dto';

@UseGuards(JwtAuthGuard)
@Controller()
export class PremiumController {
  constructor(private readonly premiumService: PremiumService) {}

  @Get('subscription')
  async getSubscription(@CurrentUser('sub') userId: string) {
    return this.premiumService.getSubscription(userId);
  }

  @Post('subscription/verify-receipt')
  @HttpCode(HttpStatus.OK)
  async verifyReceipt(
    @CurrentUser('sub') userId: string,
    @Body() dto: VerifyReceiptDto,
  ) {
    return this.premiumService.verifyReceipt(userId, dto);
  }

  @Post('subscription/restore')
  @HttpCode(HttpStatus.OK)
  async restorePurchases(
    @CurrentUser('sub') userId: string,
    @Body() dto: RestorePurchasesDto,
  ) {
    return this.premiumService.restorePurchases(userId, dto);
  }

  // --- Premium Cloud Backup Endpoints (guarded by RequirePremiumGuard) ---

  @UseGuards(RequirePremiumGuard)
  @Post('backups/:pairId')
  async uploadBackup(
    @CurrentUser('sub') userId: string,
    @Param('pairId') pairId: string,
    @Body() dto: UploadCloudBackupDto,
  ) {
    return this.premiumService.uploadBackup(userId, pairId, dto);
  }

  @UseGuards(RequirePremiumGuard)
  @Get('backups/:pairId')
  async listBackups(
    @CurrentUser('sub') userId: string,
    @Param('pairId') pairId: string,
  ) {
    return this.premiumService.listBackups(userId, pairId);
  }

  @UseGuards(RequirePremiumGuard)
  @Get('backups/:pairId/:version')
  async getBackup(
    @CurrentUser('sub') userId: string,
    @Param('pairId') pairId: string,
    @Param('version', ParseIntPipe) version: number,
  ) {
    return this.premiumService.getBackup(userId, pairId, version);
  }

  @UseGuards(RequirePremiumGuard)
  @Delete('backups/:pairId/:version')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteBackup(
    @CurrentUser('sub') userId: string,
    @Param('pairId') pairId: string,
    @Param('version', ParseIntPipe) version: number,
  ) {
    await this.premiumService.deleteBackup(userId, pairId, version);
  }
}
