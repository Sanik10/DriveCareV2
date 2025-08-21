// path: apps/backend/src/modules/subscriptions/subscription-billing/subscription-billing.controller.ts
import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Req,
  HttpStatus,
  UseInterceptors,
  UseGuards,
  HttpCode,
  ParseUUIDPipe,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiHeader,
} from '@nestjs/swagger';

import { Throttle } from '@nestjs/throttler';
import { SubscriptionBillingService } from './subscription-billing.service';

import { CreateBillingSubscriptionDto } from './dto/request/create-billing-subscription.dto';
import { ProcessPaymentDto } from './dto/request/process-payment.dto';
import { CancelSubscriptionDto } from './dto/request/cancel-subscription.dto';

import { BillingSubscriptionResponseDto } from './dto/response/billing-subscription-response.dto';
import { PaymentStatusResponseDto } from './dto/response/payment-status-response.dto';
import { ComplianceReportResponseDto } from './dto/response/compliance-report-response.dto';

import { Roles } from '../../auth/decorators/roles.decorator';
import { RequestWithUser } from '../../auth/interfaces/request-with-user.interface';

import { BILLING_CONSTANTS } from './constants/billing.constants';
import { AuthWithOwnership } from '../../../common';
import { AuditLoggingInterceptor } from '../../../common/interceptors/audit-logging.interceptor';
import { SecurityHeadersInterceptor } from '../../../common/interceptors/security-headers.interceptor';
import { EnhancedValidationPipe } from '../../../common/pipes/enhanced-validation.pipe';
import { WebhookSignatureGuard } from './guards/webhook-signature.guard';
import { BillingProvider } from './types/billing.types';

@ApiTags('🏦 Subscription Billing (RUS Compliance)')
@ApiBearerAuth()
@UseInterceptors(AuditLoggingInterceptor, SecurityHeadersInterceptor)
@Controller('subscription-billing')
export class SubscriptionBillingController {
  constructor(private readonly billingService: SubscriptionBillingService) {}

  @Post()
  @AuthWithOwnership()
  @Roles('company_owner', 'company_admin')
  @ApiOperation({
    summary: 'Создание подписки (PENDING)',
    description:
      'Создаёт подписку в статусе PENDING, без автопродления. Требует согласия с ФЗ-152 и уведомления о правах потребителей.',
  })
  @ApiHeader({
    name: 'Idempotency-Key',
    required: false,
    description: 'Ключ идемпотентности для безопасных повторов (1–128 символов)',
    schema: { type: 'string', minLength: 1, maxLength: 128 },
  })
  @ApiHeader({
    name: 'X-Idempotency-Key',
    required: false,
    description: 'Альтернативный заголовок идемпотентности',
    schema: { type: 'string', minLength: 1, maxLength: 128 },
  })
  @ApiResponse({ status: HttpStatus.CREATED, type: BillingSubscriptionResponseDto })
  @Throttle({ default: { limit: BILLING_CONSTANTS.RATE_LIMITS.CREATE.limit, ttl: BILLING_CONSTANTS.RATE_LIMITS.CREATE.ttlMs } })
  async create(
    @Body(EnhancedValidationPipe) dto: CreateBillingSubscriptionDto,
    @Req() req: RequestWithUser,
  ): Promise<BillingSubscriptionResponseDto> {
    const idempotencyKey =
      (req.headers['idempotency-key'] as string) ||
      (req.headers['x-idempotency-key'] as string) ||
      undefined;

    return this.billingService.createSubscription(req.user.companyId!, dto, {
      userId: req.user.id,
      companyId: req.user.companyId!,
      ipAddress: (req as any).ip,
      userAgent: req.headers['user-agent'],
      requestId: (req.headers['x-request-id'] as string) || undefined,
      correlationId: (req.headers['x-correlation-id'] as string) || undefined,
      idempotencyKey,
    });
  }

  @Post('payment')
  @AuthWithOwnership()
  @Roles('company_owner', 'company_admin')
  @ApiOperation({ summary: 'Оплата подписки', description: 'Обработка платежа. При успехе активирует подписку (ACTIVE).' })
  @ApiHeader({
    name: 'Idempotency-Key',
    required: false,
    description: 'Ключ идемпотентности для операции платежа',
    schema: { type: 'string', minLength: 1, maxLength: 128 },
  })
  @ApiHeader({
    name: 'X-Idempotency-Key',
    required: false,
    description: 'Альтернативный заголовок идемпотентности',
    schema: { type: 'string', minLength: 1, maxLength: 128 },
  })
  @ApiResponse({ status: HttpStatus.OK, type: PaymentStatusResponseDto })
  @Throttle({ default: { limit: BILLING_CONSTANTS.RATE_LIMITS.PAYMENT.limit, ttl: BILLING_CONSTANTS.RATE_LIMITS.PAYMENT.ttlMs } })
  async processPayment(
    @Body(EnhancedValidationPipe) dto: ProcessPaymentDto,
    @Req() req: RequestWithUser,
  ): Promise<PaymentStatusResponseDto> {
    const idempotencyKey =
      (req.headers['idempotency-key'] as string) ||
      (req.headers['x-idempotency-key'] as string) ||
      undefined;

    return this.billingService.processPayment(req.user.companyId!, dto, {
      userId: req.user.id,
      companyId: req.user.companyId!,
      ipAddress: (req as any).ip,
      userAgent: req.headers['user-agent'],
      requestId: (req.headers['x-request-id'] as string) || undefined,
      correlationId: (req.headers['x-correlation-id'] as string) || undefined,
      idempotencyKey,
    });
  }

  @Delete(':id')
  @AuthWithOwnership()
  @Roles('company_owner', 'company_admin')
  @ApiOperation({ summary: 'Отмена подписки', description: 'Отмена в соответствии с правами потребителей. Автопродление отключено.' })
  @ApiParam({ name: 'id', description: 'ID подписки' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Подписка отменена' })
  @Throttle({ default: { limit: BILLING_CONSTANTS.RATE_LIMITS.CANCEL.limit, ttl: BILLING_CONSTANTS.RATE_LIMITS.CANCEL.ttlMs } })
  async cancel(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(EnhancedValidationPipe) body: CancelSubscriptionDto,
    @Req() req: RequestWithUser,
  ): Promise<{ success: boolean; message: string }> {
    await this.billingService.cancelSubscription(req.user.companyId!, id, body, {
      userId: req.user.id,
      companyId: req.user.companyId!,
      ipAddress: (req as any).ip,
      userAgent: req.headers['user-agent'],
      requestId: (req.headers['x-request-id'] as string) || undefined,
      correlationId: (req.headers['x-correlation-id'] as string) || undefined,
    });
    return { success: true, message: 'Подписка успешно отменена' };
  }

  @Get('active')
  @AuthWithOwnership()
  @Roles('company_owner', 'company_admin', 'manager', 'cashier')
  @ApiOperation({ summary: 'Активная подписка компании' })
  @ApiResponse({ status: HttpStatus.OK, type: BillingSubscriptionResponseDto })
  @Throttle({ default: { limit: BILLING_CONSTANTS.RATE_LIMITS.ACTIVE.limit, ttl: BILLING_CONSTANTS.RATE_LIMITS.ACTIVE.ttlMs } })
  async getActive(@Req() req: RequestWithUser): Promise<BillingSubscriptionResponseDto | null> {
    return this.billingService.getActiveSubscription(req.user.companyId!);
  }

  @Get('compliance/report')
  @AuthWithOwnership()
  @Roles('company_owner', 'company_admin')
  @ApiOperation({ summary: 'Compliance-отчёт по РФ требованиям' })
  @ApiResponse({ status: HttpStatus.OK, type: ComplianceReportResponseDto })
  @Throttle({ default: { limit: BILLING_CONSTANTS.RATE_LIMITS.REPORT.limit, ttl: BILLING_CONSTANTS.RATE_LIMITS.REPORT.ttlMs } })
  async getComplianceReport(@Req() req: RequestWithUser): Promise<ComplianceReportResponseDto> {
    return this.billingService.getComplianceReport(req.user.companyId!);
  }

  @Post('webhooks/:provider')
  @UseGuards(WebhookSignatureGuard)
  @ApiOperation({ summary: 'Webhook платежей', description: 'Обработка уведомлений от платёжных провайдеров (YooKassa/Tinkoff).' })
  @ApiParam({
    name: 'provider',
    description: 'Платёжный провайдер',
    enum: ['yookassa', 'tinkoff'],
  })
  @ApiResponse({ status: HttpStatus.OK })
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: BILLING_CONSTANTS.RATE_LIMITS.WEBHOOK.limit, ttl: BILLING_CONSTANTS.RATE_LIMITS.WEBHOOK.ttlMs } })
  async handleWebhook(
    @Param('provider') providerParam: string,
    @Req() req: any,
  ): Promise<{ success: boolean }> {
    const provider = String(providerParam || '').toLowerCase() as BillingProvider;
    if (!BILLING_CONSTANTS.PROVIDERS.includes(provider as any)) {
      throw new BadRequestException(`Unsupported provider: ${providerParam}`);
    }

    const rawBody: Buffer = req.body; // Buffer — express.raw() включён для этого пути
    await this.billingService.handlePaymentWebhook(provider, rawBody, req.headers);
    return { success: true };
  }
}
