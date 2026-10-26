import { Module, DynamicModule, forwardRef } from '@nestjs/common';
import { DevLoginController } from './dev-login.controller';
import { AuthModule } from '../auth/auth.module';

@Module({})
export class DevLoginModule {
  static register(): DynamicModule {
    const isDev = process.env.NODE_ENV === 'development';
    const isEnabled = process.env.ENABLE_DEV_LOGIN === 'true';

    if (isDev && isEnabled) {
      return {
        module: DevLoginModule,
        imports: [forwardRef(() => AuthModule)],
        controllers: [DevLoginController],
      };
    }

    return {
      module: DevLoginModule,
      imports: [],
      controllers: [],
    };
  }
}
