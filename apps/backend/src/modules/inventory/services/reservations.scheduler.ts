// path: apps/backend/src/modules/inventory/services/reservations.scheduler.ts
import { Injectable, Logger, Inject } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import type { Redis } from 'ioredis';
import { REDIS_CLIENT } from '../../../common/redis/redis.constants';
import { AuditService, AuditAction } from '../../../common/audit/audit.service';
import { PartReservation, ReservationStatus } from '../../../database/entities/part-reservation.entity';

@Injectable()
export class ReservationsScheduler {
  private readonly logger = new Logger(ReservationsScheduler.name);
  private readonly lockKey = 'inventory:reservations:autoexpire:lock';
  private readonly lockTtlMs = 10 * 60 * 1000; // 10 минут

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly audit: AuditService,
  ) {}

  // Запускаем каждые 15 минут
  @Cron('0 */15 * * * *')
  async autoExpireReservations(): Promise<void> {
    const gotLock = await this.redis.set(this.lockKey, '1', 'PX', this.lockTtlMs, 'NX');
    if (!gotLock) {
      this.logger.warn('Reservations auto-expire skipped: lock is held');
      return;
    }

    try {
      const now = new Date();
      const repo = this.dataSource.getRepository(PartReservation);

      const result = await repo
        .createQueryBuilder()
        .update(PartReservation)
        .set({ status: ReservationStatus.EXPIRED })
        .where('status = :status AND expires_at IS NOT NULL AND expires_at <= :now', {
          status: ReservationStatus.ACTIVE,
          now,
        })
        .execute();

      const affected = result.affected || 0;
      if (affected > 0) {
        await this.audit.log(AuditAction.RESERVATION_RELEASED, {
          // Используем событие как тех.фиксацию массового изменения статусов (событие "cleanup")
          entityType: 'PartReservation',
          details: {
            action: 'auto_expire_reservations',
            expiredCount: affected,
            at: now.toISOString(),
          },
          status: 'success',
        });
        this.logger.log(`Auto-expired reservations: ${affected}`);
      } else {
        this.logger.log('Auto-expire reservations: no candidates');
      }
    } catch (e: any) {
      this.logger.error(`Auto-expire failed: ${e?.message || e}`);
      await this.audit.logApiError({
        details: { action: 'auto_expire_reservations', error: e?.message || String(e) },
        status: 'error',
      });
    } finally {
      await this.redis.del(this.lockKey).catch(() => undefined);
    }
  }
}
