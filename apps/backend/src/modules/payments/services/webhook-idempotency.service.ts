// path: apps/backend/src/modules/payments/services/webhook-idempotency.service.ts
import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Redis } from 'ioredis';
import { REDIS_CLIENT } from '../../../common/redis/redis.constants';

@Injectable()
export class WebhookIdempotencyService {
  private readonly logger = new Logger(WebhookIdempotencyService.name);

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  /**
   * Returns true if key was set (first time), false if duplicate.
   */
  async checkAndSet(key: string, ttlSec: number): Promise<boolean> {
    try {
      const res = await this.redis.set(key, '1', 'EX', Math.max(1, Math.floor(ttlSec)), 'NX');
      return res === 'OK';
    } catch (e: any) {
      this.logger.warn(`Idempotency Redis error: ${e?.message || e}. Falling back to "allow once".`);
      // Best-effort: allow processing to avoid dropping legitimate events
      return true;
    }
  }
}
