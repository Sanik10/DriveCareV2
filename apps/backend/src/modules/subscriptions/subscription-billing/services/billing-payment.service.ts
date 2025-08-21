// path: apps/backend/src/modules/subscriptions/subscription-billing/services/billing-payment.service.ts
import { Injectable, Logger, BadRequestException, NotFoundException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Subscription } from '../../../../database/entities/subscription.entity';
import {
  SubscriptionPaymentLog,
  SubscriptionPaymentStatus,
  PaymentMethodType,
} from '../../../../database/entities/subscription-payment-log.entity';

import { ProcessPaymentDto } from '../dto/request/process-payment.dto';
import { AuditContext, BillingProvider } from '../types/billing.types';
import { PaymentGatewayInterface } from '../interfaces/payment-gateway.interface';
import { YooKassaGateway } from './gateways/yookassa.gateway';
import { TinkoffGateway } from './gateways/tinkoff.gateway';
import { BILLING_CONSTANTS } from '../constants/billing.constants';
import { createHash } from 'crypto';
import { REDIS_CLIENT } from '../../../auth/constants/redis.constants';
import { BillingBusinessService } from './billing-business.service';

function parseJsonSafe(body: any): any {
  if (!body) return {};
  if (Buffer.isBuffer(body)) {
    try {
      return JSON.parse(body.toString('utf8'));
    } catch {
      return {};
    }
  }
  if (typeof body === 'string') {
    try {
      return JSON.parse(body);
    } catch {
      return {};
    }
  }
  return body;
}

@Injectable()
export class BillingPaymentService {
  private readonly logger = new Logger(BillingPaymentService.name);

  constructor(
    @InjectRepository(Subscription) private readonly subRepo: Repository<Subscription>,
    @InjectRepository(SubscriptionPaymentLog) private readonly payRepo: Repository<SubscriptionPaymentLog>,
    private readonly yooKassa: YooKassaGateway,
    private readonly tinkoff: TinkoffGateway,
    private readonly business: BillingBusinessService,
    @Inject(REDIS_CLIENT) private readonly redis: any,
  ) {}

  private getGateway(provider?: string): PaymentGatewayInterface {
    const prov = (provider || process.env.DEFAULT_PAYMENT_PROVIDER || 'yookassa').toLowerCase();
    if (prov === 'tinkoff') return this.tinkoff;
    return this.yooKassa;
  }

  private truncateJson(obj: any, maxBytes = BILLING_CONSTANTS.MAX_GATEWAY_RESPONSE_BYTES): any {
    try {
      const str = JSON.stringify(obj ?? {});
      if (Buffer.byteLength(str, 'utf8') <= maxBytes) return obj;
      const truncated = str.slice(0, maxBytes - 3) + '...';
      return JSON.parse(truncated);
    } catch {
      return { truncated: true };
    }
  }

  async createOrCapturePayment(
    companyId: string,
    dto: ProcessPaymentDto,
    ctx: AuditContext,
  ): Promise<{
    paymentId: string;
    status: 'pending' | 'succeeded' | 'failed';
    provider: BillingProvider;
    redirectUrl?: string;
  }> {
    const sub = await this.subRepo.findOne({ where: { id: dto.subscriptionId, companyId } });
    if (!sub) throw new NotFoundException('Подписка не найдена');

    if (dto.currency !== 'RUB') {
      throw new BadRequestException('Поддерживается только валюта RUB');
    }

    const gateway = this.getGateway(dto.gatewayProvider);
    const result = await gateway.createPayment(
      {
        amount: dto.amount,
        currency: 'RUB',
        paymentMethod: (dto.paymentMethod || 'bank_transfer') as any,
        gatewayProvider: (dto.gatewayProvider || 'yookassa') as any,
        metadata: dto.metadata,
      },
      { idempotencyKey: ctx.idempotencyKey },
    );

    const log = await this.payRepo.save({
      subscriptionId: sub.id,
      companyId,
      amount: dto.amount.toFixed(2),
      currency: 'RUB',
      status:
        result.status === 'succeeded'
          ? SubscriptionPaymentStatus.COMPLETED
          : result.status === 'failed'
          ? SubscriptionPaymentStatus.FAILED
          : SubscriptionPaymentStatus.PENDING,
      gatewayType: result.provider,
      gatewayTransactionId: result.id,
      gatewayResponse: this.truncateJson(result.raw),
      mirCardUsed: dto.paymentMethod === 'mir',
      paymentMethodType: (dto.paymentMethod?.toLowerCase() as PaymentMethodType) || PaymentMethodType.BANK_TRANSFER,
      amlCheckStatus: 'passed',
      amlRiskScore: 0,
      suspiciousActivityReported: false,
      userIpAddress: ctx.ipAddress || null,
      userAgent: ctx.userAgent || null,
      processingLocation: 'RU',
      description: 'Subscription payment',
    });

    this.logger.log(`Платёж создан: ${log.id}, provider=${result.provider}, status=${result.status}`);

    return {
      paymentId: log.id,
      status: result.status,
      provider: result.provider as BillingProvider,
      redirectUrl: result.redirectUrl,
    };
  }

  async handleWebhook(
    provider: BillingProvider,
    payloadRaw: Buffer,
    headers: Record<string, string | string[] | undefined> = {},
  ): Promise<void> {
    // Идемпотентность вебхуков: дедуп по хэшу сырого тела
    const hash = createHash('sha256').update(payloadRaw || Buffer.from('')).digest('hex');
    const redisKey = BILLING_CONSTANTS.REDIS_KEYS.WEBHOOK_EVENT(provider, hash);
    const ttl = BILLING_CONSTANTS.CACHE_TTL.WEBHOOK_DEDUP_MS / 1000;

    const setRes = await this.redis.set(redisKey, '1', 'NX', 'EX', ttl);
    if (!setRes) {
      this.logger.warn(`Webhook deduplicated for provider=${provider}, hash=${hash}`);
      return;
    }

    const gateway = this.getGateway(provider);
    const payloadObj = parseJsonSafe(payloadRaw);

    const { paymentId, status } = await gateway.handleWebhook(payloadObj, headers);

    const existing = await this.payRepo.findOne({ where: { gatewayTransactionId: paymentId } });
    if (!existing) {
      this.logger.warn(`Webhook: payment log not found for gateway payment id ${paymentId}`);
      return;
    }

    let newStatus: SubscriptionPaymentStatus = existing.status;
    if (status === 'succeeded') newStatus = SubscriptionPaymentStatus.COMPLETED;
    else if (status === 'failed') newStatus = SubscriptionPaymentStatus.FAILED;
    else if (status === 'refunded') newStatus = SubscriptionPaymentStatus.REFUNDED;
    else if (status === 'cancelled') newStatus = SubscriptionPaymentStatus.CANCELLED;
    else newStatus = SubscriptionPaymentStatus.PENDING;

    await this.payRepo.update(existing.id, {
      status: newStatus,
      gatewayResponse: this.truncateJson({ ...(existing.gatewayResponse || {}), webhook: payloadObj }),
    });

    this.logger.log(`Webhook: updated payment log ${existing.id} -> ${newStatus}`);

    // Авто-действия по статусам
    try {
      if (newStatus === SubscriptionPaymentStatus.COMPLETED && existing.subscriptionId) {
        await this.business.activateSubscription(existing.subscriptionId, {
          companyId: existing.companyId,
        } as AuditContext);
        this.logger.log(`Auto-activated subscription ${existing.subscriptionId} on webhook success`);
      }

      if (
        (newStatus === SubscriptionPaymentStatus.REFUNDED || newStatus === SubscriptionPaymentStatus.CANCELLED) &&
        existing.subscriptionId
      ) {
        await this.business.cancelSubscription(
          existing.companyId,
          existing.subscriptionId,
          newStatus === SubscriptionPaymentStatus.REFUNDED ? 'payment_refunded' : 'payment_cancelled',
          { companyId: existing.companyId } as AuditContext,
        );
        this.logger.log(`Auto-cancelled subscription ${existing.subscriptionId} due to ${newStatus}`);
      }
    } catch (e) {
      this.logger.error(
        `Auto action failed for subscription ${existing.subscriptionId}: ${e?.message || e}`,
      );
    }
  }
}
