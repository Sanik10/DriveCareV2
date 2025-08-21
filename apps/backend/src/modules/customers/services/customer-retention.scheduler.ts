// path: apps/backend/src/modules/customers/services/customer-retention.scheduler.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, IsNull } from 'typeorm';
import { Inject } from '@nestjs/common';
import { REDIS_CLIENT } from '../../../common/redis/redis.constants';
import { Customer } from '../../../database/entities/customer.entity';
import { CustomerAnonymizationService } from './customer-anonymization.service';
import { AuditService } from '../../../common/audit/audit.service';
import type { Redis } from 'ioredis';

@Injectable()
export class CustomerRetentionScheduler {
  private readonly logger = new Logger(CustomerRetentionScheduler.name);
  private readonly lockKey = 'customers:anonymize:running';
  private readonly lockTtlMs = 15 * 60 * 1000; // 15 минут

  constructor(
    @InjectRepository(Customer) private readonly customersRepo: Repository<Customer>,
    private readonly anonymizationService: CustomerAnonymizationService,
    private readonly audit: AuditService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  // Ежедневно в 03:00 по серверному времени
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async handleRetentionAnonymization() {
    const gotLock = await this.redis.set(this.lockKey, '1', 'PX', this.lockTtlMs, 'NX');
    if (!gotLock) {
      this.logger.warn('Retention anonymization skipped: lock is held');
      return;
    }

    const now = new Date();
    const batchSize = 100;

    try {
      const candidates = await this.customersRepo.find({
        where: {
          dataRetentionUntil: LessThanOrEqual(now),
          anonymizedAt: IsNull(),
        },
        take: batchSize,
        order: { dataRetentionUntil: 'ASC' },
      });

      if (candidates.length === 0) {
        this.logger.log('Retention anonymization: no candidates');
        return;
      }

      this.logger.log(`Retention anonymization: processing ${candidates.length} customers`);

      for (const c of candidates) {
        try {
          await this.anonymizationService.anonymizeCustomer(c.id, c.companyId, {
            userId: null,
            ip: '127.0.0.1',
            ua: 'scheduler',
          });
        } catch (e: any) {
          this.logger.error(`Anonymize failed for ${c.id}: ${e?.message || e}`);
          await this.audit.logApiError({
            companyId: c.companyId,
            details: {
              scheduler: 'customer_retention',
              customerId: c.id,
              error: e?.message || String(e),
            },
            status: 'error',
          });
        }
      }
    } finally {
      await this.redis.del(this.lockKey).catch(() => undefined);
    }
  }
}
