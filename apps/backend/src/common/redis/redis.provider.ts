// path: apps/backend/src/common/redis/redis.provider.ts
import { Provider, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis, { Redis as RedisClient, RedisOptions } from 'ioredis';
import { REDIS_CLIENT } from './redis.constants';

export const RedisProvider: Provider = {
  provide: REDIS_CLIENT,
  inject: [ConfigService],
  useFactory: async (config: ConfigService): Promise<RedisClient> => {
    const logger = new Logger('RedisProvider');

    const url = config.get<string>('REDIS_URL');
    const host = config.get<string>('REDIS_HOST', 'localhost');
    const port = parseInt(config.get<string>('REDIS_PORT') || '6379', 10);
    const password = config.get<string>('REDIS_PASSWORD');

    const common: RedisOptions = {
      lazyConnect: true,
      maxRetriesPerRequest: 3,
      enableAutoPipelining: true,
      connectTimeout: 10_000,
      commandTimeout: 5_000,
      retryStrategy: (times) => (times < 10 ? Math.min(times * 200, 2_000) : null),
      reconnectOnError: (err) => {
        const msg = err?.message || '';
        // реконнект на сетевых ошибках/READONLY и т.п.
        if (/READONLY|ECONNRESET|EPIPE|ETIMEDOUT|ECONNREFUSED/i.test(msg)) return true;
        return false;
      },
    };

    let client: RedisClient;

    if (url) {
      const isSecure = url.startsWith('rediss://');
      logger.log(`Connecting to Redis via URL (${isSecure ? 'TLS' : 'plain'})`);

      // Разбираем URL, чтобы при необходимости прокинуть пароль через options
      try {
        const parsed = new URL(url);
        const opts: RedisOptions = { ...common, tls: isSecure ? {} : undefined };

        // Если в URL нет пароля, но REDIS_PASSWORD задан — пробрасываем его
        if (!parsed.password && password) {
          opts.password = password;
        }

        client = new Redis(url, opts);
      } catch {
        // Фоллбек на host/port
        client = new Redis({ host, port, password: password || undefined, ...common });
        logger.warn('Invalid REDIS_URL format. Falling back to host/port/password.');
      }
    } else {
      logger.log(`Connecting to Redis via host/port ${host}:${port}`);
      client = new Redis({ host, port, password: password || undefined, ...common });
    }

    client.on('error', (err) => logger.error(`redis error: ${err?.message || err}`));
    client.on('end', () => logger.warn('Redis connection closed'));
    client.on('reconnecting', () => logger.warn('Redis reconnecting...'));
    client.on('ready', () => logger.log('Redis ready'));

    try {
      await client.connect();
      await client.ping();
      logger.log('Redis connected successfully');
      return client;
    } catch (err) {
      logger.error(`Redis connection failed: ${err?.message || err}`);
      throw err;
    }
  },
};
