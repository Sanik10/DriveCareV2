// path: apps/backend/src/database/seeds/run-seeds.ts
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from '../../app.module';
import { SeedsService } from './seeds.service';

async function runSeeds() {
  const logger = new Logger('SeedsRunner');
  
  try {
    logger.log('🚀 Starting seeds runner...');
    
    const app = await NestFactory.createApplicationContext(AppModule);
    const seedsService = app.get(SeedsService);
    
    await seedsService.runAllSeeds();
    
    await app.close();
    logger.log('✅ Seeds runner completed successfully');
    process.exit(0);
  } catch (error) {
    logger.error('❌ Seeds runner failed:', error);
    process.exit(1);
  }
}

runSeeds();