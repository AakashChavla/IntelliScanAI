import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as express from 'express';
import { ValidationPipe, BadRequestException, Logger } from '@nestjs/common';
import * as dotenv from 'dotenv';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

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

  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 8000;

  // 🔹 Swagger setup with Bearer Auth
  const config = new DocumentBuilder()
    .setTitle('IntelliScanAI API')
    .setDescription('API documentation for IntelliScanAI')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
      'access-token', // must match @ApiBearerAuth('access-token')
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);

  // 🔹 Custom Swagger options to auto-store token
  const swaggerCustomOptions = {
    swaggerOptions: {
      persistAuthorization: true, // keep token even after page reload
      responseInterceptor: (res) => {
        try {
          // Detect login response
          if (res.url.includes('/auth/login')) {
            const body = JSON.parse(res.text);
            if (body?.data?.token) {
              const token = body.data.token;
              // Auto-set token in Swagger Authorize
              // @ts-ignore
              window.ui.authActions.authorize({
                'access-token': {
                  name: 'Authorization',
                  schema: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
                  value: token,
                },
              });
            }
          }
        } catch (e) {
          console.error('Swagger response interceptor error:', e);
        }
        return res;
      },
    },
  };

  SwaggerModule.setup('api', app, document, swaggerCustomOptions);

  await app.listen(port);
  Logger.log(`🚀 Server is running on: http://localhost:${port}/api`);
}
bootstrap();
