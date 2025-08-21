// path: apps/backend/src/modules/subscriptions/subscription-billing/subscription-billing.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { BillingBusinessService } from './services/billing-business.service';
import { BillingComplianceService } from './services/billing-compliance.service';
import { BillingPaymentService } from './services/billing-payment.service';
import { BillingNotificationService } from './services/billing-notification.service';

import { CreateBillingSubscriptionDto } from './dto/request/create-billing-subscription.dto';
import { ProcessPaymentDto } from './dto/request/process-payment.dto';
import { CancelSubscriptionDto } from './dto/request/cancel-subscription.dto';

import { BillingSubscriptionResponseDto } from './dto/response/billing-subscription-response.dto';
import { PaymentStatusResponseDto } from './dto/response/payment-status-response.dto';
import { ComplianceReportResponseDto } from './dto/response/compliance-report-response.dto';
import { AuditContext, BillingProvider } from './types/billing.types';

@Injectable()
export class SubscriptionBillingService {
  private readonly logger = new Logger(SubscriptionBillingService.name);

  constructor(
    private readonly business: BillingBusinessService,
    private readonly compliance: BillingComplianceService,
    private readonly payments: BillingPaymentService,
    private readonly notifications: BillingNotificationService,
  ) {}

  async createSubscription(companyId: string, dto: CreateBillingSubscriptionDto, ctx: AuditContext): Promise<BillingSubscriptionResponseDto> {
    await this.compliance.validateDataLocalization(companyId);
    await this.compliance.ensureCreateInputs(companyId, dto);
    const sub = await this.business.createPendingSubscription(companyId, dto, ctx);
    return this.business.mapToResponse(sub);
  }

  async processPayment(companyId: string, dto: ProcessPaymentDto, ctx: AuditContext): Promise<PaymentStatusResponseDto> {
    await this.compliance.validateNpsPreconditions(companyId, dto);
    const result = await this.payments.createOrCapturePayment(companyId, dto, ctx);
    if (result.status === 'succeeded') {
      await this.business.activateSubscription(dto.subscriptionId, ctx);
    }
    return {
      subscriptionId: dto.subscriptionId,
      paymentId: result.paymentId,
      status: result.status === 'succeeded' ? 'completed' : (result.status as any),
      amount: dto.amount,
      currency: dto.currency,
      provider: result.provider,
      redirectUrl: result.redirectUrl,
    };
  }

  async cancelSubscription(companyId: string, subscriptionId: string, body: CancelSubscriptionDto, ctx: AuditContext): Promise<void> {
    await this.compliance.enforceConsumerRights(subscriptionId, companyId);
    await this.business.cancelSubscription(companyId, subscriptionId, body?.reason, ctx);
    await this.notifications.safeNotifyCancellation(subscriptionId, companyId, body?.reason);
  }

  async getActiveSubscription(companyId: string): Promise<BillingSubscriptionResponseDto | null> {
    const sub = await this.business.getActiveSubscription(companyId);
    return sub ? this.business.mapToResponse(sub) : null;
  }

  async getComplianceReport(companyId: string): Promise<ComplianceReportResponseDto> {
    return this.compliance.getComplianceReport(companyId);
  }

  async handlePaymentWebhook(provider: BillingProvider, payloadRaw: Buffer, headers: Record<string, string | string[] | undefined>): Promise<void> {
    await this.payments.handleWebhook(provider, payloadRaw, headers);
  }
}
