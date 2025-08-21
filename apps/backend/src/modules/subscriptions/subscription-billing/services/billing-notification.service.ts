import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class BillingNotificationService {
  private readonly logger = new Logger(BillingNotificationService.name);

  // MVP: безопасные заглушки, чтобы не падать, если нет e-mail сервиса
  async safeNotifyCancellation(subscriptionId: string, companyId: string, reason?: string): Promise<void> {
    this.logger.log(`(MVP) Уведомление об отмене: subscription=${subscriptionId}, company=${companyId}, reason=${reason || 'n/a'}`);
  }
}
