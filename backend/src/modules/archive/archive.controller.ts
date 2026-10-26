import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ArchiveService, CreateTicketDto } from './archive.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('restoration')
export class ArchiveController {
  constructor(private readonly archiveService: ArchiveService) {}

  @Post('tickets')
  async createTicket(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateTicketDto,
  ) {
    return this.archiveService.createTicket(userId, dto);
  }

  @Get('tickets')
  async getUserTickets(@CurrentUser('sub') userId: string) {
    return this.archiveService.getUserTickets(userId);
  }

  @Get('tickets/:id')
  async getTicket(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
  ) {
    return this.archiveService.getTicketById(userId, id);
  }
}
