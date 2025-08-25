import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as express from 'express';
import { ValidationPipe, BadRequestException, Logger } from '@nestjs/common';
import * as dotenv from 'dotenv';
dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(express.json());
  app.enableCors();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      exceptionFactory: (errors) => {
        const firstError = errors[0];
        if (firstError.constraints) {
          const firstMessage = Object.values(firstError.constraints)[0];
          return new BadRequestException(firstMessage);
        }
        return new BadRequestException('Validation failed');
      },
    }),
  );

  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 8080;

  await app.listen(port);
  Logger.log(`Server is running on: http://localhost:${port}`);
}
bootstrap();
