import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as express from 'express';
import { ValidationPipe, BadRequestException, Logger } from '@nestjs/common';
import * as dotenv from 'dotenv';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
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

  // Swagger setup (production-ready)
  const swaggerConfig = new DocumentBuilder()
    .setTitle('IntelliScanAI API')
    .setDescription('Production API documentation for IntelliScanAI')
    .setVersion('1.0.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'access-token',
    )
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'reset-password-token',
    )
    .addServer(`http://localhost:${process.env.PORT || 8080}`)
    .build();

  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, swaggerDocument, {
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'none',
      filter: true,
      showRequestDuration: true,
    },
    customSiteTitle: 'IntelliScanAI API Docs',
  });

  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 8080;

  await app.listen(port);
  Logger.log(`Server is running on: http://localhost:${port}`);
  Logger.log(`Swagger docs available at: http://localhost:${port}/api/docs`);
}
bootstrap();