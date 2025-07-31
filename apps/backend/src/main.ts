import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  
  // Dynamic API prefix
  const apiPrefix = configService.get('API_PREFIX', 'api/v1');
  app.setGlobalPrefix(apiPrefix);
  
  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
  }));

  // Dynamic Swagger configuration
  const swaggerTitle = configService.get('SWAGGER_TITLE', 'DriveCare API');
  const swaggerDescription = configService.get('SWAGGER_DESCRIPTION', 'API документация');
  const appVersion = configService.get('APP_VERSION', '2.0');
  
  const config = new DocumentBuilder()
    .setTitle(swaggerTitle)
    .setDescription(swaggerDescription)
    .setVersion(appVersion)
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Введите JWT токен',
        in: 'header',
      },
      'JWT-auth',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  const swaggerPath = configService.get('SWAGGER_PATH', 'docs');
  SwaggerModule.setup(swaggerPath, app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
    customSiteTitle: `${swaggerTitle} Docs`,
  });

  // Dynamic CORS origins
  const corsOrigins = configService.get('CORS_ORIGINS', 'http://localhost:3000,http://localhost:5173')
    .split(',')
    .map(origin => origin.trim());

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  const port = configService.get('PORT', 3001);
  await app.listen(port);

  console.log(`🚀 ${swaggerTitle} running on: http://localhost:${port}`);
  console.log(`📚 API Docs: http://localhost:${port}/${swaggerPath}`);
  console.log(`🔍 API Health: http://localhost:${port}/${apiPrefix}/health`);
}

bootstrap();
