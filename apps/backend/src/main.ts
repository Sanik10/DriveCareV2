import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Глобальная валидация
  app.useGlobalPipes(new ValidationPipe({ 
    transform: true, 
    whitelist: true,
    forbidNonWhitelisted: true 
  }));
  
  // CORS
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  });
  
  // API prefix
  app.setGlobalPrefix(process.env.API_PREFIX || 'api/v1');
  
  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`🚀 DriveCare API running on: http://localhost:${port}`);
  console.log(`📚 API Docs: http://localhost:${port}/docs`);
}

bootstrap().catch(err => {
  console.error('Error starting server:', err);
  process.exit(1);
});
