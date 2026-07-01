import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug'],
  });

  // Global prefix for all API routes
  app.setGlobalPrefix('api');

  // Enable URI versioning
  app.enableVersioning({ type: VersioningType.URI });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Global exception filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // Global logging interceptor
  app.useGlobalInterceptors(new LoggingInterceptor());

  // CORS
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type,Authorization,X-Correlation-ID,X-Request-ID',
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(
    JSON.stringify({
      ts: new Date().toISOString(),
      level: 'info',
      service: 'ey-sprint-business-services',
      message: 'server-started',
      port,
      env: process.env.NODE_ENV ?? 'development',
    }),
  );
}

bootstrap();

