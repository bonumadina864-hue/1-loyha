import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const logger = new Logger('PairlyBootstrap');
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3000);
  const nodeEnv = configService.get<string>('NODE_ENV', 'development');
  const enableDevLogin = configService.get<string>('ENABLE_DEV_LOGIN', 'false');

  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Global pipes, filters and interceptors
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  // Swagger Interactive Documentation & Visual UI
  const config = new DocumentBuilder()
    .setTitle('Pairly Private Messaging API')
    .setDescription(
      'Private 1-on-1 messaging platform with Envelope Encryption, Audited Admin Restoration, and Privacy Controls',
    )
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'access-token',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {
    customSiteTitle: 'Pairly API Visual Dashboard',
  });

  await app.listen(port);
  logger.log(`🚀 Pairly Backend running on port ${port} [NODE_ENV=${nodeEnv}]`);
  logger.log(`🌐 Visual Interactive Dashboard available at: http://localhost:${port}/api`);
  if (nodeEnv === 'development' && enableDevLogin === 'true') {
    logger.warn('⚠️  Dev-Login route ACTIVE at POST /auth/dev-login');
  } else {
    logger.log('🔒 Dev-Login route physically excluded');
  }
}

bootstrap();
