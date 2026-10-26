import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { MessagingService } from './messaging.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('messages')
export class MessagingController {
  constructor(private readonly messagingService: MessagingService) {}

  @Get(':pairId')
  async getMessages(
    @CurrentUser('sub') userId: string,
    @Param('pairId') pairId: string,
    @Query('before') beforeId?: string,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit = 50,
  ) {
    const safeLimit = Math.min(Math.max(limit, 1), 100);
    return this.messagingService.getMessages(userId, pairId, beforeId, safeLimit);
  }

  @Post(':pairId/sync')
  async syncMessages(
    @CurrentUser('sub') userId: string,
    @Param('pairId') pairId: string,
    @Body('lastMessageId') lastMessageId?: string,
  ) {
    return this.messagingService.getMessages(userId, pairId, lastMessageId, 50);
  }
}
