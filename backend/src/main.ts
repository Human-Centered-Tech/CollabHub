import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { json, raw } from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
    logger: ['log', 'error', 'warn'],
  });

  // GitHub webhook needs the raw body for HMAC verification.
  app.use('/api/webhooks/github', raw({ type: '*/*', limit: '10mb' }));
  app.use(json({ limit: '5mb' }));

  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173';
  app.enableCors({
    origin: [frontendUrl, 'http://localhost:5173'],
    credentials: true,
  });

  const port = parseInt(process.env.PORT ?? '3000', 10);
  await app.listen(port, '0.0.0.0');
  Logger.log(`CollabHub backend listening on :${port}`, 'Bootstrap');
}

bootstrap();
