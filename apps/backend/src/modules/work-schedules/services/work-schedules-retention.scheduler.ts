// path: apps/backend/src/modules/work-schedules/services/work-schedules-retention.scheduler.ts
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { WorkSchedulesDataService } from './work-schedules-data.service';
import { REDIS_CLIENT } from '../../../common/redis/redis.constants';
import type { Redis } from 'ioredis';

@Injectable()
export class WorkSchedulesRetentionScheduler {
  private readonly logger = new Logger(WorkSchedulesRetentionScheduler.name);
  private readonly lockTtlMs = 5 * 60 * 1000; // 5 минут

  constructor(
    private readonly dataService: WorkSchedulesDataService,
    private readonly config: ConfigService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  // Внимание: значение CRON читается из ENV при загрузке модуля (см. Core Wave 2 конфиг).
  @Cron(process.env.WORK_SCHEDULE_EXCEPTIONS_ANON_CRON || '0 4 * * *')
  async handleAnonymizationCron(): Promise<void> {
    const cronExpr = process.env.WORK_SCHEDULE_EXCEPTIONS_ANON_CRON || '0 4 * * *';
    this.logger.log(`Running Work-Schedules exceptions anonymization cron "${cronExpr}"`);

    try {
      const companies = await this.dataService.getCompaniesWithDueAnonymization(200);
      if (!companies.length) {
        this.logger.log('No companies with due exceptions for anonymization');
        return;
      }

      let totalAnonymized = 0;
      for (const companyId of companies) {
        const lockKey = `ws:exceptions:anon:${companyId}`;
        const token = await this.acquireLock(lockKey, this.lockTtlMs);
        if (!token) {
          // Уже обрабатывается в другом инстансе — пропускаем
          continue;
        }

        try {
          const affected = await this.dataService.anonymizeExpiredExceptions(companyId);
          totalAnonymized += affected;
          if (affected > 0) {
            this.logger.log(`Company ${companyId}: anonymized ${affected} schedule exceptions`);
          }
        } catch (err: any) {
          this.logger.error(`Anonymize failed for company ${companyId}: ${err?.message || err}`);
        } finally {
          await this.releaseLock(lockKey, token);
        }
      }

      this.logger.log(`Anonymization cron finished. Total anonymized: ${totalAnonymized}`);
    } catch (err: any) {
      this.logger.error(`Anonymization cron error: ${err?.message || err}`);
    }
  }

  private async acquireLock(key: string, ttlMs: number): Promise<string | null> {
    const token = Math.random().toString(36).slice(2);
    const ok = await this.redis.set(key, token, 'PX', ttlMs, 'NX');
    return ok === 'OK' ? token : null;
  }

  private async releaseLock(key: string, token: string): Promise<void> {
    // Скрипт на Lua для атомарного освобождения блокировки по токену
    const lua =
      "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end";
    try {
      await this.redis.eval(lua, 1, key, token);
    } catch (err: any) {
      this.logger.warn(`Failed to release lock ${key}: ${err?.message || err}`);
    }
  }
}
