import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import * as express from "express";
import { ValidationPipe, BadRequestException, Logger } from "@nestjs/common";
import * as dotenv from "dotenv";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
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
        return new BadRequestException("Validation failed");
      },
    })
  );

  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 8000;

  // Swagger setup
  const config = new DocumentBuilder()
    .setTitle("Task Management API")
    .setDescription("API documentation for Jira-like Task Management")
    .setVersion("1.0")
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api", app, document);

  await app.listen(port);
  Logger.log(`Server is running on: http://localhost:${port}/api`);
}
bootstrap();
