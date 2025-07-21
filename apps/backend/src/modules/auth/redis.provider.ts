import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { REDIS_CONSTANTS } from './constants/redis.constants';

export const RedisProvider: Provider = {
  provide: 'REDIS_CLIENT',
  useFactory: (configService: ConfigService) => {
    const host = configService.get('REDIS_HOST', REDIS_CONSTANTS.CONNECTION.DEFAULT_HOST);
    const port = configService.get('REDIS_PORT', REDIS_CONSTANTS.CONNECTION.DEFAULT_PORT);
    
    if (!host || !port) {
      throw new Error('Redis configuration is missing: REDIS_HOST and REDIS_PORT are required');
    }
    
    console.log(`🔗 Connecting to Redis at ${host}:${port}`);
    
    return new Redis({
      host,
      port: parseInt(port), // Убеждаемся что port - число
      lazyConnect: true,
      maxRetriesPerRequest: REDIS_CONSTANTS.CONNECTION.MAX_RETRIES,
      connectTimeout: 10000,
      commandTimeout: 5000,
      // Убираем проблемные опции, оставляем только базовые
    });
  },
  inject: [ConfigService],
};