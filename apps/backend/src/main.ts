import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Global prefix
  app.setGlobalPrefix('api/v1');
  
  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
  }));

  // Swagger configuration with JWT
  const config = new DocumentBuilder()
    .setTitle('DriveCare API')
    .setDescription('Система управления автосервисом - API документация')
    .setVersion('2.0')
    .addTag('🔐 Аутентификация', 'Регистрация, вход, управление сессиями')
    .addTag('👥 Пользователи', 'Управление пользователями')
    .addTag('🏢 Компании', 'Управление компаниями')
    .addTag('🚗 Клиенты', 'Управление клиентами и транспортом')
    .addTag('📋 Заказы', 'Управление заказами и услугами')
    .addTag('📦 Склад', 'Управление складом и запчастями')
    // Добавляем JWT авторизацию
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Введите JWT токен',
        in: 'header',
      },
      'JWT-auth', // Это ключ, который используется в @ApiBearerAuth('JWT-auth')
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true, // Сохраняет токен между перезагрузками страницы
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
    customSiteTitle: 'DriveCare API Docs',
  });

  // CORS
  app.enableCors({
    origin: ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
  });

  const port = process.env.PORT || 3001;
  await app.listen(port);

  console.log(`🚀 DriveCare API running on: http://localhost:${port}`);
  console.log(`📚 API Docs: http://localhost:${port}/docs`);
  console.log(`🔍 API Health: http://localhost:${port}/api/v1/health`);
}

bootstrap();