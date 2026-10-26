import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Subscription, CloudBackup, Pair } from '../../database/entities';
import { PremiumService } from './premium.service';
import { PremiumController } from './premium.controller';
import { MockRevenueCatService } from './billing/mock-revenuecat.service';
import { RequirePremiumGuard } from './guards/require-premium.guard';

@Module({
  imports: [TypeOrmModule.forFeature([Subscription, CloudBackup, Pair])],
  providers: [PremiumService, MockRevenueCatService, RequirePremiumGuard],
  controllers: [PremiumController],
  exports: [PremiumService, RequirePremiumGuard],
})
export class PremiumModule {}
