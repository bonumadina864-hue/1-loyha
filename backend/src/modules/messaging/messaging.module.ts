import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import {
  Message,
  MessageReceipt,
  Pair,
  UserSettings,
} from '../../database/entities';
import { MessagingService } from './messaging.service';
import { MessagingGateway } from './messaging.gateway';
import { MessagingController } from './messaging.controller';
import { PairingModule } from '../pairing/pairing.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Message, MessageReceipt, Pair, UserSettings]),
    JwtModule,
    PairingModule,
  ],
  providers: [MessagingService, MessagingGateway],
  controllers: [MessagingController],
  exports: [MessagingService, MessagingGateway],
})
export class MessagingModule {}
