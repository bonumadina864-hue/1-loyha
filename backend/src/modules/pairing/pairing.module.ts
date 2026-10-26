import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  User,
  Pair,
  PairRequest,
  PairEncryptionKey,
  Block,
  MessageReceipt,
} from '../../database/entities';
import { PairingService } from './pairing.service';
import { PairingController } from './pairing.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Pair,
      PairRequest,
      PairEncryptionKey,
      Block,
      MessageReceipt,
    ]),
  ],
  providers: [PairingService],
  controllers: [PairingController],
  exports: [PairingService],
})
export class PairingModule {}
