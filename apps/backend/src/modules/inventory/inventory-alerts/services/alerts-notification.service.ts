// path: apps/backend/src/modules/inventory/inventory-alerts/services/alerts-notification.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Redis } from 'ioredis';
import { Inject } from '@nestjs/common';
import { REDIS_CLIENT } from '../../../../common/redis/redis.constants';
import { InventoryAlert } from '../../../../database/entities';
import { createHash } from 'crypto';
import nodemailer from 'nodemailer';
import { AlertsDataService } from './alerts-data.service';
import { NotificationResult } from '../types/alerts.types';

@Injectable()
export class AlertsNotificationService {
  private readonly logger = new Logger(AlertsNotificationService.name);
  private readonly idempTtlMs: number;

  constructor(
    private readonly config: ConfigService,
    private readonly alertsDataService: AlertsDataService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {
    this.idempTtlMs = this.config.get<number>('inventory.idempotencyTtlMs') || 6 * 60 * 60 * 1000;
  }

  private getSmtpConfig() {
    const host = this.config.get<string>('email.host');
    const port = this.config.get<number>('email.port') || 587;
    const user = this.config.get<string>('email.auth.user');
    const pass = this.config.get<string>('email.auth.pass');
    const from = this.config.get<string>('email.from') || 'noreply@drivecare.com';
    const secure = port === 465; // 465 -> TLS
    return { host, port, secure, auth: user && pass ? { user, pass } : undefined, from };
  }

  private async sendEmailBulk(to: string[], subject: string, text: string): Promise<NotificationResult> {
    const smtp = this.getSmtpConfig();
    if (!smtp.host) {
      // Безопасное поведение: не падаем в dev/stage, логируем
      this.logger.warn(`SMTP not configured — skip email send. subject="${subject}" recipients=${to.length}`);
      return {
        success: false,
        sentCount: 0,
        failedCount: to.length,
        errors: to.map((r) => ({ recipient: r, error: 'SMTP not configured' })),
        sentAt: new Date(),
      };
    }

    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      auth: smtp.auth,
    });

    let sent = 0;
    const errors: Array<{ recipient: string; error: string }> = [];

    for (const recipient of to) {
      try {
        await transporter.sendMail({
          from: smtp.from,
          to: recipient,
          subject,
          text,
        });
        sent++;
      } catch (e: any) {
        errors.push({ recipient, error: e?.message || 'send failed' });
      }
    }

    return {
      success: errors.length === 0,
      sentCount: sent,
      failedCount: errors.length,
      errors,
      sentAt: new Date(),
    };
  }

  async sendTestEmail(companyId: string, recipients: string[], subject: string, message: string): Promise<NotificationResult> {
    // Идемпотентность делается на уровне контроллера/сервиса; тут — только доставка
    const result = await this.sendEmailBulk(recipients, subject, message);
    return result;
  }

  // Отправка уведомления при создании алерта (с дедупом, чтобы не слать дубликаты)
  async dispatchAlertCreated(companyId: string, alert: InventoryAlert): Promise<NotificationResult | null> {
    const settings = await this.alertsDataService.getOrCreateSettings(companyId);
    if (!settings.enableEmailNotifications || !settings.emailAddresses || settings.emailAddresses.length === 0) {
      this.logger.debug(`No email recipients configured for company ${companyId} — skip alert dispatch`);
      return null;
    }

    const subject = `[Inventory Alert][${alert.priority}] ${alert.type} — ${alert.part?.name || 'Запчасть'}`;
    const text =
      `${alert.title || 'Складское уведомление'}\n\n` +
      `${alert.message || ''}\n` +
      `Текущий остаток: ${alert.currentQuantity ?? '-'}; Порог: ${alert.thresholdQuantity ?? '-'}\n` +
      `Создано: ${new Date(alert.createdAt).toISOString()}`;

    // Dedup ключ: idemp:alerts:dispatch:<companyId>:<type>:<entityId>:<hash>
    const hash = createHash('sha256').update([subject, text].join('|')).digest('hex');
    const key = `idemp:alerts:dispatch:${companyId}:${alert.type}:${alert.partId || alert.id}:${hash}`;
    const exists = await this.redis.get(key);
    if (exists) {
      this.logger.debug(`Dispatch dedup hit for ${key} — skipping email send`);
      return null;
    }

    const res = await this.sendEmailBulk(settings.emailAddresses, subject, text);
    await this.redis.psetex(key, this.idempTtlMs, '1').catch(() => undefined);
    return res;
  }
}
