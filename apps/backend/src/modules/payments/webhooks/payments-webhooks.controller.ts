// path: apps/backend/src/modules/payments/webhooks/payments-webhooks.controller.ts
import {
  Controller,
  Post,
  Req,
  HttpCode,
  HttpStatus,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { ConfigService } from '@nestjs/config';

import { PaymentsDataService } from '../services/payments-data.service';
import { PaymentsBusinessService } from '../services/payments-business.service';
import { WebhookIdempotencyService } from '../services/webhook-idempotency.service';
import { WebhookIpAclGuard } from '../guards/webhook-ip-acl.guard';
import { PaymentStatus, UserWithCompany } from '../types/payments.types';
import { YooKassaPaymentsClient } from '../services/yookassa-payments.client';

function parseJsonSafe(body: any): any {
  const source = (body !== undefined && body !== null) ? body : {};
  if (Buffer.isBuffer(source)) {
    try {
      return JSON.parse(source.toString('utf8'));
    } catch {
      return {};
    }
  }
  if (typeof source === 'string') {
    try {
      return JSON.parse(source);
    } catch {
      return {};
    }
  }
  if (typeof source === 'object') return source;
  return {};
}

@Controller('payments/webhooks')
export class PaymentsWebhooksController {
  private readonly logger = new Logger(PaymentsWebhooksController.name);

  constructor(
    private readonly config: ConfigService,
    private readonly paymentsData: PaymentsDataService,
    private readonly paymentsBusiness: PaymentsBusinessService,
    private readonly idem: WebhookIdempotencyService,
    private readonly ykClient: YooKassaPaymentsClient,
  ) {}

  @Post('yookassa')
  @UseGuards(WebhookIpAclGuard)
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  async handleYooKassa(@Req() req: Request): Promise<any> {
    const raw = (req as any).rawBody ?? (req as any).body;
    const payload = parseJsonSafe(raw);
    const event = String(payload?.event || 'unknown');
    const obj = payload?.object || {};
    const pspPaymentId: string | undefined = obj?.id;

    if (!pspPaymentId) {
      this.logger.warn('YooKassa webhook: missing object.id in payload');
      return { ok: true, accepted: true, reason: 'missing_payment_id' };
    }

    const ttl = this.config.get<number>('billing.webhooks.idempotencyTtlSec', 300);
    const key = `webhook:payments:yookassa:${event}:${pspPaymentId}`;
    const firstSeen = await this.idem.checkAndSet(key, ttl);
    if (!firstSeen) {
      // Duplicate event — acknowledge without reprocessing
      return { ok: true, duplicate: true };
    }

    // Compensating control (161‑ФЗ): verify status server-to-server with PSP
    let providerStatus: 'succeeded' | 'canceled' | 'pending' = 'pending';
    try {
      providerStatus = await this.ykClient.checkPaymentStatus(pspPaymentId);
    } catch (e: any) {
      this.logger.error(`Failed to verify YooKassa payment ${pspPaymentId}: ${e?.message || e}`);
      // Acknowledge, rely on PSP retries and our polling if used
      return { ok: false, retry: true };
    }

    const targetStatus =
      providerStatus === 'succeeded'
        ? PaymentStatus.PROCESSED
        : providerStatus === 'canceled'
        ? PaymentStatus.CANCELED
        : null;

    if (!targetStatus) {
      // Not actionable yet (pending/waiting_for_capture)
      return { ok: true, accepted: true, status: providerStatus };
    }

    const payment = await this.paymentsData.findByGatewayTransactionId(pspPaymentId);
    if (!payment) {
      this.logger.warn(
        `YooKassa webhook: payment not found by gatewayTransactionId=${pspPaymentId} (event=${event}); skipping`,
      );
      return { ok: true, accepted: true, reason: 'payment_not_found' };
    }

    if (payment.status === targetStatus) {
      return { ok: true, alreadyUpToDate: true, status: payment.status };
    }

    const systemUser: UserWithCompany = {
      id: 'system-webhook-yookassa',
      email: 'webhooks@yookassa',
      role: 'superadmin',
      companyId: payment.companyId,
      firstName: 'System',
      lastName: 'Webhook',
    };

    await this.paymentsBusiness.updatePayment(
      payment.id,
      { status: targetStatus, gatewayTransactionId: pspPaymentId },
      systemUser,
    );

    return { ok: true, updated: true, status: targetStatus };
  }

  @Post('tinkoff')
  @UseGuards(WebhookIpAclGuard)
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  async handleTinkoff(@Req() req: Request): Promise<any> {
    // Skeleton for future implementation; acknowledge safely for MVP
    const raw = (req as any).rawBody ?? (req as any).body;
    const payload = parseJsonSafe(raw);
    const eventId =
      payload?.Event ||
      payload?.Status ||
      payload?.Operation ||
      payload?.PaymentId ||
      payload?.OrderId ||
      'unknown';

    const ttl = this.config.get<number>('billing.webhooks.idempotencyTtlSec', 300);
    const key = `webhook:payments:tinkoff:${eventId}`;
    const firstSeen = await this.idem.checkAndSet(key, ttl);
    if (!firstSeen) return { ok: true, duplicate: true };

    // TODO (P1): implement Tinkoff status verification and mapping
    this.logger.log(`Tinkoff webhook received (safely acknowledged): ${eventId}`);
    return { ok: true, accepted: true };
  }
}
