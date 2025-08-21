import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from '../app.module';
import { SeedsService } from '../database/seeds/seeds.service';

/**
 * 🔐 CLI TOOL: Создание superadmin в production
 * Использование: npm run db:create-admin
 */
async function createSuperadmin() {
  console.log('🔐 Production Superadmin Creation Tool');
  console.log('=====================================');
  
  try {
    // 🚀 Создаем application context
    const app = await NestFactory.createApplicationContext(AppModule, {
      logger: ['error', 'warn', 'log'],
    });

    const configService = app.get(ConfigService);
    const seedsService = app.get(SeedsService);
    const environment = configService.get('NODE_ENV', 'development');

    console.log(`🌍 Environment: ${environment}`);
    
    // 🔐 Проверяем credentials в environment
    const superadminEmail = configService.get('SUPERADMIN_EMAIL');
    const superadminPassword = configService.get('SUPERADMIN_PASSWORD');
    
    if (!superadminEmail || !superadminPassword) {
      console.error('❌ Missing SUPERADMIN_EMAIL or SUPERADMIN_PASSWORD in environment variables');
      console.log('📋 Required environment variables:');
      console.log('   - SUPERADMIN_EMAIL=admin@yourdomain.com');
      console.log('   - SUPERADMIN_PASSWORD=YourSecurePassword123!');
      process.exit(1);
    }

    console.log(`📧 Email: ${superadminEmail}`);
    console.log('🔐 Password: ****** (from environment)');
    
    // 🔍 Проверяем существование
    const exists = await seedsService.checkSuperadminExists();
    if (exists) {
      console.log('⚠️  Superadmin already exists. Use different email or remove existing user.');
      process.exit(0);
    }

    // 🚀 Создаем superadmin
    console.log('🔨 Creating superadmin...');
    await seedsService.runAllSeeds(); // Создаст роль и пользователя
    
    console.log('✅ Superadmin created successfully!');
    console.log('🔑 You can now login with the provided credentials.');
    
    await app.close();
    
  } catch (error) {
    console.error('❌ Failed to create superadmin:', error.message);
    process.exit(1);
  }
}

// 🚀 Запуск CLI
createSuperadmin();
