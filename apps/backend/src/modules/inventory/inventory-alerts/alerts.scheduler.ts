// path: apps/backend/src/modules/inventory/inventory-alerts/alerts.scheduler.ts
import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { InventoryAlertSettings } from '../../../database/entities/inventory-alert-settings.entity';
import { Repository } from 'typeorm';
import { Inject } from '@nestjs/common';
import type { Redis } from 'ioredis';
import { REDIS_CLIENT } from '../../../common/redis/redis.constants';
import { AlertsDataService } from './services/alerts-data.service';
import { AlertsBusinessService } from './services/alerts-business.service';
import { CronJob } from 'cron';

@Injectable()
export class AlertsScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AlertsScheduler.name);
  private jobName = 'inventory-alerts-scheduler';

  constructor(
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly configService: ConfigService,
    @InjectRepository(InventoryAlertSettings)
    private readonly settingsRepo: Repository<InventoryAlertSettings>,
    private readonly alertsDataService: AlertsDataService,
    private readonly alertsBusinessService: AlertsBusinessService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async onModuleInit() {
    const enabled = this.configService.get<boolean>('inventory.alerts.enabled');
    const cronExpr = this.configService.get<string>('inventory.alerts.cron') || '0 * * * *';
    if (!enabled) {
      this.logger.log('Alerts scheduler disabled by config (inventory.alerts.enabled=false)');
      return;
    }
    const job = new CronJob(cronExpr, () => {
      this.run().catch((e) => this.logger.error(`Scheduler run failed: ${e?.message || e}`));
    });
    this.schedulerRegistry.addCronJob(this.jobName, job);
    job.start();
    this.logger.log(`Alerts scheduler started with CRON "${cronExpr}"`);
  }

  onModuleDestroy() {
    try {
      const job = this.schedulerRegistry.getCronJob(this.jobName);
      job?.stop();
      this.schedulerRegistry.deleteCronJob(this.jobName);
    } catch (_) {
      // ignore
    }
  }

  private computeLockTtlMs(cronExpr: string): number {
    // Грубая эвристика: если CRON «0 * * * *» — hourly (55 мин), иначе — assume minute (55 сек)
    return cronExpr.trim().startsWith('0 ') ? 55 * 60 * 1000 : 55 * 1000;
  }

  private async getDistinctCompanyIdsFromSettings(): Promise<string[]> {
    const rows = await this.settingsRepo
      .createQueryBuilder('s')
      .select('DISTINCT s.companyId', 'companyId')
      .where('s.userId IS NULL')
      .getRawMany();
    return rows.map((r) => r.companyId).filter(Boolean);
  }

  async run(): Promise<void> {
    const enabled = this.configService.get<boolean>('inventory.alerts.enabled');
    if (!enabled) return;

    const cronExpr = this.configService.get<string>('inventory.alerts.cron') || '0 * * * *';
    const ttlMs = this.computeLockTtlMs(cronExpr);
    const companyIds = await this.getDistinctCompanyIdsFromSettings();

    if (companyIds.length === 0) {
      this.logger.debug('No companies with alert settings found — skipping scheduler tick');
      return;
    }

    for (const companyId of companyIds) {
      await this.runForCompany(companyId, ttlMs).catch((e) =>
        this.logger.error(`Scheduler company ${companyId} failed: ${e?.message || e}`),
      );
    }
  }

  private async runForCompany(companyId: string, ttlMs: number): Promise<void> {
    const lockKey = `lock:alerts:scheduler:${companyId}`;
    const lock = await this.redis.set(lockKey, '1', 'PX', ttlMs, 'NX');
    if (!lock) {
      this.logger.debug(`Skip scheduler for company ${companyId} — lock is held`);
      return;
    }

    try {
      const settings = await this.alertsDataService.getOrCreateSettings(companyId);
      const hours = settings.autoDismissAfterHours ?? 72;
      if (hours < 1) {
        this.logger.debug(`Auto-dismiss disabled (hours=${hours}) for company ${companyId}`);
        return;
      }

      // Используем бизнес-метод с параметром (не жёсткий константный порог)
      const dismissedCount = await this.alertsBusinessService.cleanupExpiredAlertsWithSettings(companyId, hours);
      if (dismissedCount > 0) {
        this.logger.log(`Auto-dismissed ${dismissedCount} expired alerts for company ${companyId}`);
      }
    } finally {
      await this.redis.del(lockKey).catch(() => undefined);
    }
  }
}
