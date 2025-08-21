// path: apps/backend/src/common/redis/redis.module.ts
import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisProvider } from './redis.provider';
import { REDIS_CLIENT } from './redis.constants';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [RedisProvider],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
