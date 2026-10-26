import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  UpdateSettingsDto,
  BlockUserDto,
  CreateReportDto,
  DeleteAccountDto,
} from './dto/settings.dto';

@UseGuards(JwtAuthGuard)
@Controller()
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('settings')
  async getSettings(@CurrentUser('sub') userId: string) {
    return this.settingsService.getSettings(userId);
  }

  @Patch('settings')
  async updateSettings(
    @CurrentUser('sub') userId: string,
    @Body() dto: UpdateSettingsDto,
  ) {
    return this.settingsService.updateSettings(userId, dto);
  }

  @Post('blocks')
  async blockUser(
    @CurrentUser('sub') userId: string,
    @Body() dto: BlockUserDto,
  ) {
    return this.settingsService.blockUser(userId, dto.userId);
  }

  @Delete('blocks/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async unblockUser(
    @CurrentUser('sub') userId: string,
    @Param('userId') targetUserId: string,
  ) {
    await this.settingsService.unblockUser(userId, targetUserId);
  }

  @Get('blocks')
  async listBlocks(@CurrentUser('sub') userId: string) {
    return this.settingsService.getBlockedUsers(userId);
  }

  @Post('reports')
  async reportUser(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateReportDto,
  ) {
    return this.settingsService.reportUser(userId, dto);
  }

  @Delete('account')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAccount(
    @CurrentUser('sub') userId: string,
    @Body() dto: DeleteAccountDto,
  ) {
    await this.settingsService.deleteAccount(userId, dto);
  }

  @Get('account/export')
  async exportData(@CurrentUser('sub') userId: string) {
    return this.settingsService.exportUserData(userId);
  }
}
