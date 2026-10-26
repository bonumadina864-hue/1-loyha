import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  RestorationTicket,
  Pair,
  Message,
  AdminAuditLog,
  AdminUser,
} from '../../database/entities';
import { ArchiveService } from './archive.service';
import { ArchiveController } from './archive.controller';
import { PairingModule } from '../pairing/pairing.module';
import { MessagingModule } from '../messaging/messaging.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RestorationTicket,
      Pair,
      Message,
      AdminAuditLog,
      AdminUser,
    ]),
    PairingModule,
    MessagingModule,
  ],
  providers: [ArchiveService],
  controllers: [ArchiveController],
  exports: [ArchiveService],
})
export class ArchiveModule {}
