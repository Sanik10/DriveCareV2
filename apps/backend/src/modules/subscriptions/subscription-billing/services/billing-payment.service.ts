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
import { createHash, randomUUID } from 'crypto';
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

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function mapLogStatusToGatewayStatus(
  status: SubscriptionPaymentStatus,
): 'pending' | 'succeeded' | 'failed' {
  if (status === SubscriptionPaymentStatus.COMPLETED) return 'succeeded';
  if (status === SubscriptionPaymentStatus.FAILED) return 'failed';
  return 'pending';
}

function parseIdempotencyValue(raw: string | null): { paymentId?: string; ts?: string } | null {
  if (!raw) return null;
  try {
    const obj = JSON.parse(raw);
    return obj && typeof obj === 'object' ? obj : null;
  } catch {
    return null;
  }
}

const RELEASE_LOCK_LUA = `
if redis.call("GET", KEYS[1]) == ARGV[1] then
  return redis.call("DEL", KEYS[1])
else
  return 0
end
`;

async function safeReleaseRedisLock(redis: any, key: string, expectedValue: string): Promise<void> {
  // ioredis: eval(script, numKeys, key1, arg1)
  try {
    await redis.eval(RELEASE_LOCK_LUA, 1, key, expectedValue);
    return;
  } catch {}

  // node-redis v4: eval(script, { keys: [...], arguments: [...] })
  try {
    await redis.eval(RELEASE_LOCK_LUA, { keys: [key], arguments: [expectedValue] });
  } catch {}
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
    const prov = (
      provider ||
      process.env.DEFAULTPAYMENTPROVIDER ||        // канон по конфигу
      process.env.DEFAULT_PAYMENT_PROVIDER ||      // временный fallback
      'yookassa'
    ).toLowerCase();

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
    chargedAmount: number;
    currency: 'RUB';
  }> {
    // P0.5: Idempotency for payment creation
    const ttlSec =
      (BILLING_CONSTANTS.CACHE_TTL as any).PAYMENT_IDEMPOTENCY_TTL_SEC ??
      Math.ceil(BILLING_CONSTANTS.CACHE_TTL.IDEMPOTENCY_MS / 1000);

    let idempotencyRedisKey: string | null = null;
    let lockAcquired = false;

    let lockPayload: string | null = null;

    if (ctx?.idempotencyKey) {
      const hash = createHash('sha256')
        .update(`${dto.subscriptionId}:${String(ctx.idempotencyKey)}`)
        .digest('hex');

      idempotencyRedisKey = BILLING_CONSTANTS.REDIS_KEYS.IDEMPOTENCY_PAYMENT(companyId, hash);

      const token = randomUUID();
      lockPayload = JSON.stringify({ paymentId: 'LOCK', ts: new Date().toISOString(), token });

      const setRes = await this.redis.set(idempotencyRedisKey, lockPayload, 'NX', 'EX', ttlSec);

      if (!setRes) {
        for (let attempt = 0; attempt < 3; attempt++) {
          const raw = await this.redis.get(idempotencyRedisKey);
          const parsed = parseIdempotencyValue(raw);

          if (parsed?.paymentId && parsed.paymentId !== 'LOCK') {
            const existingLog = await this.payRepo.findOne({ where: { id: parsed.paymentId } as any });
            if (existingLog) {
              return {
                paymentId: existingLog.id,
                status: mapLogStatusToGatewayStatus(existingLog.status),
                provider: existingLog.gatewayType as BillingProvider,
                redirectUrl: undefined,
                chargedAmount: Number(existingLog.amount),
                currency: existingLog.currency as any,
              };
            }
          }

          await sleep(70);
          continue;
        }

        throw new BadRequestException('payment is being created, retry with same idempotency key');
      }

      lockAcquired = true;
    }

    try {
      const sub = await this.subRepo.findOne({
        where: { id: dto.subscriptionId, companyId },
        relations: ['tariff'],
      });
      if (!sub) throw new NotFoundException('Подписка не найдена');

      // Валюта фиксирована
      const currency: 'RUB' = 'RUB';

      // Определяем период и сумму на сервере
      const ms = sub.endDate.getTime() - sub.startDate.getTime();
      const approxDays = ms / 86400000;
      const period: 'monthly' | 'yearly' =
        (sub as any).billingPeriod || (approxDays >= 330 ? 'yearly' : 'monthly');

      const price = period === 'yearly' ? sub.tariff?.priceYearly : sub.tariff?.priceMonthly;
      if (typeof price !== 'number' || isNaN(price)) {
        throw new BadRequestException('Невозможно определить стоимость тарифа');
      }

      // Минимальные/максимальные пороги безопасности
      if (price < 1) throw new BadRequestException('Сумма платежа слишком мала');
      if (price > 1_000_000) throw new BadRequestException('Сумма платежа превышает допустимый предел');

      const gateway = this.getGateway(dto.gatewayProvider);
      const result = await gateway.createPayment(
        {
          amount: price,
          currency,
          paymentMethod: (dto.paymentMethod || 'card') as any, // по умолчанию редиректный сценарий
          gatewayProvider: (dto.gatewayProvider || 'yookassa') as any,
          metadata: {
            subscriptionId: sub.id,
            companyId,
            context: 'subscription',
            billingPeriod: period,
          },
        },
        { idempotencyKey: ctx.idempotencyKey },
      );

      let log: SubscriptionPaymentLog;

      try {
        log = await this.payRepo.save({ /*...*/ });
      } catch (e: any) {
        const err = e?.driverError ?? e;
        if (
          ctx?.idempotencyKey &&
          err?.code === '23505' &&
          (err?.constraint === 'uniq_sub_pay_idempotency' || String(err?.message || '').includes('uniq_sub_pay_idempotency'))
        ) {
          const existingLog = await this.payRepo.findOne({
            where: {
              companyId,
              subscriptionId: dto.subscriptionId,
              idempotencyKey: String(ctx.idempotencyKey),
            } as any,
          });

          if (existingLog) {
            return {
              paymentId: existingLog.id,
              status: mapLogStatusToGatewayStatus(existingLog.status),
              provider: existingLog.gatewayType as BillingProvider,
              redirectUrl: undefined,
              chargedAmount: Number(existingLog.amount),
              currency: existingLog.currency as any,
            };
          }
        }
        throw e;
      }

      if (idempotencyRedisKey && lockAcquired) {
        const finalPayload = JSON.stringify({
          paymentId: String(log.id),
          ts: new Date().toISOString(),
        });
        // обновляем только существующий ключ (XX), TTL оставляем тем же окном
        await this.redis.set(idempotencyRedisKey, finalPayload, 'XX', 'EX', ttlSec);
      }

      this.logger.log(
        `Платёж создан: ${log.id}, provider=${result.provider}, status=${result.status}, amount=${price.toFixed(
          2,
        )} ${currency}`,
      );

      return {
        paymentId: log.id,
        status: result.status,
        provider: result.provider as BillingProvider,
        redirectUrl: result.redirectUrl,
        chargedAmount: price,
        currency,
      };
    } catch (e) {
      if (idempotencyRedisKey && lockAcquired && lockPayload) {
        try {
          await safeReleaseRedisLock(this.redis, idempotencyRedisKey, lockPayload);
        } catch {}
      }
      throw e;
    }
  }


  async handleWebhook(
    provider: BillingProvider,
    payloadRaw: Buffer,
    headers: Record<string, string | string[] | undefined> = {},
  ): Promise<void> {
    // Идемпотентность вебхуков: дедуп по хэшу сырого тела
    const hash = createHash('sha256').update(payloadRaw || Buffer.from('')).digest('hex');
    const redisKey = BILLING_CONSTANTS.REDIS_KEYS.WEBHOOK_EVENT(provider, hash);
    const ttl = BILLING_CONSTANTS.CACHE_TTL.WEBHOOK_IDEMPOTENCY_TTL_SEC;

    const setRes = await this.redis.set(redisKey, '1', 'NX', 'EX', ttl);
    if (!setRes) {
      this.logger.warn(`Webhook deduplicated for provider=${provider}, hash=${hash}`);
      return;
    }

    const gateway = this.getGateway(provider);
    const payloadObj = parseJsonSafe(payloadRaw);

    const { paymentId, status } = await gateway.handleWebhook(payloadObj, headers);

    // Идемпотентность вебхуков на уровне бизнес-события: provider + paymentId + status
    const semanticKey = BILLING_CONSTANTS.REDIS_KEYS.WEBHOOK_PAYMENT_EVENT(
      provider,
      String(paymentId),
      String(status),
    );

    const semanticSet = await this.redis.set(semanticKey, '1', 'NX', 'EX', ttl);
    if (!semanticSet) {
      this.logger.warn(`Webhook semantic dedup hit provider=${provider}, paymentId=${paymentId}, status=${status}`);
      return;
    }

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
      this.logger.error(`Auto action failed for subscription ${existing.subscriptionId}: ${e?.message || e}`);
    }
  }
}
