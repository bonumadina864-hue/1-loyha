import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RedisModule } from './modules/redis/redis.module';
import { CryptoModule } from './modules/crypto/crypto.module';
import { AuthModule } from './modules/auth/auth.module';
import { DevLoginModule } from './modules/dev-login/dev-login.module';
import { PairingModule } from './modules/pairing/pairing.module';
import { MessagingModule } from './modules/messaging/messaging.module';
import { ArchiveModule } from './modules/archive/archive.module';
import { AdminModule } from './modules/admin/admin.module';
import { PremiumModule } from './modules/premium/premium.module';
import { SettingsModule } from './modules/settings/settings.module';
import * as entities from './database/entities';
import { createDatabaseDataSource } from './database/data-source.factory';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.example'],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DATABASE_HOST', 'localhost'),
        port: config.get<number>('DATABASE_PORT', 5432),
        username: config.get<string>('DATABASE_USER', 'postgres'),
        password: config.get<string>('DATABASE_PASSWORD', 'postgres'),
        database: config.get<string>('DATABASE_NAME', 'pairly'),
        entities: Object.values(entities),
        synchronize: true,
        ssl: config.get<string>('DATABASE_SSL') === 'true' ? { rejectUnauthorized: false } : false,
        retryAttempts: 1, // Don't hang on connection attempts
        retryDelay: 1000,
      }),
      dataSourceFactory: async (options) => {
        return createDatabaseDataSource(options);
      },
    }),
    RedisModule,
    CryptoModule,
    AuthModule,
    DevLoginModule.register(),
    PairingModule,
    MessagingModule,
    ArchiveModule,
    AdminModule,
    PremiumModule,
    SettingsModule,
  ],
})
export class AppModule {}
