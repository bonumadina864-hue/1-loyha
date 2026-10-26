import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { PairingService } from './pairing.service';
import {
  SendPairRequestDto,
  AcceptPairRequestDto,
  UpdateNicknameDto,
} from './dto/pairing.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('pairs')
export class PairingController {
  constructor(private readonly pairingService: PairingService) {}

  @Get('lookup/:publicId')
  async lookup(
    @CurrentUser('sub') userId: string,
    @Param('publicId') publicId: string,
  ) {
    return this.pairingService.lookupByPublicId(userId, publicId);
  }

  @Post('request')
  async sendRequest(
    @CurrentUser('sub') userId: string,
    @Body() dto: SendPairRequestDto,
  ) {
    return this.pairingService.sendRequest(userId, dto.toPublicId);
  }

  @Get('requests/pending')
  async getPendingRequests(@CurrentUser('sub') userId: string) {
    return this.pairingService.getPendingRequests(userId);
  }

  @Post('requests/:id/accept')
  async acceptRequest(
    @CurrentUser('sub') userId: string,
    @Param('id') requestId: string,
    @Body() dto: AcceptPairRequestDto,
  ) {
    return this.pairingService.acceptRequest(userId, requestId, dto.nickname);
  }

  @Post('requests/:id/decline')
  @HttpCode(HttpStatus.NO_CONTENT)
  async declineRequest(
    @CurrentUser('sub') userId: string,
    @Param('id') requestId: string,
  ) {
    await this.pairingService.declineRequest(userId, requestId);
  }

  @Get()
  async getPairs(@CurrentUser('sub') userId: string) {
    return this.pairingService.getPairs(userId);
  }

  @Patch(':id/nickname')
  async updateNickname(
    @CurrentUser('sub') userId: string,
    @Param('id') pairId: string,
    @Body() dto: UpdateNicknameDto,
  ) {
    await this.pairingService.updateNickname(userId, pairId, dto.nickname);
    return { success: true };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async unpair(
    @CurrentUser('sub') userId: string,
    @Param('id') pairId: string,
  ) {
    await this.pairingService.unpair(userId, pairId);
  }
}
