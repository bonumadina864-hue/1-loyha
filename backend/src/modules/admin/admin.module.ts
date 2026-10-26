import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  AdminUser,
  AdminAuditLog,
  User,
  Pair,
  Message,
  RestorationTicket,
  Subscription,
  Report,
} from '../../database/entities';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { AdminAuthGuard } from './guards/admin-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { ArchiveModule } from '../archive/archive.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AdminUser,
      AdminAuditLog,
      User,
      Pair,
      Message,
      RestorationTicket,
      Subscription,
      Report,
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>(
          'JWT_ACCESS_SECRET',
          'pairly_super_secure_jwt_access_secret_key_2026_dev',
        ),
        signOptions: { expiresIn: '8h' },
      }),
    }),
    ArchiveModule,
  ],
  providers: [AdminService, AdminAuthGuard, RolesGuard],
  controllers: [AdminController],
  exports: [AdminService, AdminAuthGuard, RolesGuard],
})
export class AdminModule {}
