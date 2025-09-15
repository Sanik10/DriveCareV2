// path: apps/backend/src/modules/payments/payments.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UsePipes,
  Request,
  Logger,
  ParseUUIDPipe,
  HttpStatus,
  HttpCode,
  DefaultValuePipe,
  ParseIntPipe,
  Headers,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiBearerAuth,
  ApiSecurity,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
  ApiBadRequestResponse,
  ApiTooManyRequestsResponse,
  ApiInternalServerErrorResponse,
  ApiHeader,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CompanyOwnershipGuard } from '../../common/guards/company-ownership.guard';
import { AuditLoggingInterceptor } from '../../common/interceptors/audit-logging.interceptor';
import { EnhancedValidationPipe } from '../../common/pipes/enhanced-validation.pipe';
import { PaymentsService } from './payments.service';
import { RecordPaymentDto } from './dto/request/record-payment.dto';
import { RefundPaymentDto } from './dto/request/refund-payment.dto';
import { UpdatePaymentDto } from './dto/request/update-payment.dto';
import { PaymentResponseDto } from './dto/response/payment-response.dto';
import { PaginatedPaymentsResponseDto } from './dto/response/paginated-payments-response.dto';
import { PaymentStatisticsDto } from './dto/response/payment-statistics.dto';
import { CompanyBalanceDto } from './dto/response/company-balance.dto';
import { PaymentFilter, PaymentStatus } from './types/payments.types';
import { RequestWithUser } from '../auth/interfaces/request-with-user.interface';
import { PAYMENTS_CONSTANTS } from './constants/payments.constants';
import { OnlinePaymentInitDto } from './dto/request/online-init.dto';
import { OnlinePaymentInitResponseDto } from './dto/response/online-init-response.dto';

@ApiTags('💳 Управление платежами')
@ApiBearerAuth()
@ApiSecurity('JWT')
@Controller('payments')
@UseGuards(JwtAuthGuard, RolesGuard, CompanyOwnershipGuard)
@UseInterceptors(AuditLoggingInterceptor)
@UsePipes(EnhancedValidationPipe)
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('online/init')
  @HttpCode(HttpStatus.CREATED)
  @Roles(...PAYMENTS_CONSTANTS.ROLES.CAN_RECORD_PAYMENT)
  @ApiOperation({
    summary: 'Инициировать онлайн-оплату (YooKassa)',
    description:
      'Создаёт платёж у провайдера с передачей чека (54‑ФЗ) и возвращает URL для редиректа. Требуется X-Idempotency-Key.',
  })
  @ApiHeader({
    name: 'X-Idempotency-Key',
    required: false,
    description: 'Идемпотентный ключ (UUID). Рекомендуется передавать всегда.',
    schema: { type: 'string', example: 'c1f8d2ce-1f39-4c2e-9b63-7f21e6e5ad10' },
  })
  @ApiBody({ type: OnlinePaymentInitDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'URL подтверждения оплаты получен',
    type: OnlinePaymentInitResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Некорректные данные' })
  @ApiUnauthorizedResponse({ description: 'Требуется авторизация' })
  @ApiForbiddenResponse({ description: 'Недостаточно прав или инвойс не принадлежит компании' })
  @ApiTooManyRequestsResponse({ description: 'Слишком много запросов' })
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async initOnlinePayment(
    @Body() dto: OnlinePaymentInitDto,
    @Headers('x-idempotency-key') idemKey: string | undefined,
    @Request() req: RequestWithUser,
  ): Promise<OnlinePaymentInitResponseDto> {
    this.logger.log(`Init online payment for invoice ${dto.invoiceId} by company ${req.user.companyId}`);
    return this.paymentsService.initOnlinePayment(dto, req.user, idemKey);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(...PAYMENTS_CONSTANTS.ROLES.CAN_RECORD_PAYMENT)
  @ApiOperation({ summary: 'Записать новый платеж' })
  @ApiBody({ type: RecordPaymentDto })
  @ApiResponse({ status: HttpStatus.CREATED, type: PaymentResponseDto })
  async recordPayment(
    @Body() recordPaymentDto: RecordPaymentDto,
    @Request() req: RequestWithUser,
  ): Promise<PaymentResponseDto> {
    this.logger.log(`Recording payment for company ${req.user.companyId}`);
    return this.paymentsService.recordPayment(recordPaymentDto, req.user);
  }

  @Get()
  @Roles(...PAYMENTS_CONSTANTS.ROLES.CAN_VIEW_PAYMENT_HISTORY)
  @ApiOperation({ summary: 'Получить список платежей' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: PaymentStatus })
  @ApiResponse({ status: HttpStatus.OK, type: PaginatedPaymentsResponseDto })
  @Throttle({ default: { limit: 100, ttl: 60000 } })
  async getPayments(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Request() req: RequestWithUser,
    @Query('status') status?: PaymentStatus,
    @Query('invoiceId') invoiceId?: string,
    @Query('paymentMethodId') paymentMethodId?: string,
    @Query('amountFrom') amountFrom?: number,
    @Query('amountTo') amountTo?: number,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('search') search?: string,
    @Query('sortField', new DefaultValuePipe('paymentDate')) sortField: string = 'paymentDate',
    @Query('sortOrder', new DefaultValuePipe('desc')) sortOrder: 'asc' | 'desc' = 'desc',
  ): Promise<PaginatedPaymentsResponseDto> {
    this.logger.log(`Getting payments for company ${req.user.companyId}`);
    const filter: PaymentFilter = {
      page,
      limit: Math.min(limit, PAYMENTS_CONSTANTS.DEFAULTS.MAX_ITEMS),
      status,
      invoiceId,
      paymentMethodId,
      amountFrom,
      amountTo,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
      search,
      sortField,
      sortOrder,
      companyId: req.user.companyId,
    };
    return this.paymentsService.getPayments(filter);
  }

  @Get(':id')
  @Roles(...PAYMENTS_CONSTANTS.ROLES.CAN_VIEW_PAYMENT_HISTORY)
  @ApiOperation({ summary: 'Получить детали платежа' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: HttpStatus.OK, type: PaymentResponseDto })
  @Throttle({ default: { limit: 200, ttl: 60000 } })
  async getPaymentById(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: RequestWithUser,
  ): Promise<PaymentResponseDto> {
    this.logger.log(`Getting payment ${id} for company ${req.user.companyId}`);
    return this.paymentsService.getPaymentById(id, req.user);
  }

  @Put(':id')
  @Roles(...PAYMENTS_CONSTANTS.ROLES.CAN_PROCESS_PAYMENT)
  @ApiOperation({ summary: 'Обновить платеж' })
  @ApiParam({ name: 'id', type: String })
  @ApiBody({ type: UpdatePaymentDto })
  @ApiResponse({ status: HttpStatus.OK, type: PaymentResponseDto })
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async updatePayment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updatePaymentDto: UpdatePaymentDto,
    @Request() req: RequestWithUser,
  ): Promise<PaymentResponseDto> {
    this.logger.log(`Updating payment ${id} for company ${req.user.companyId}`);
    return this.paymentsService.updatePayment(id, updatePaymentDto, req.user);
  }

  @Post(':id/refund')
  @Roles(...PAYMENTS_CONSTANTS.ROLES.CAN_REFUND_PAYMENT)
  @ApiOperation({ summary: 'Оформить возврат платежа' })
  @ApiParam({ name: 'id', type: String })
  @ApiBody({ type: RefundPaymentDto })
  @ApiResponse({ status: HttpStatus.OK, type: PaymentResponseDto })
  @Throttle({ default: { limit: 10, ttl: 3600000 } })
  async refundPayment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() refundPaymentDto: RefundPaymentDto,
    @Request() req: RequestWithUser,
  ): Promise<PaymentResponseDto> {
    this.logger.log(`Processing refund for payment ${id}, company ${req.user.companyId}`);
    return this.paymentsService.refundPayment(id, refundPaymentDto, req.user);
  }

  @Get('analytics/statistics')
  @Roles(...PAYMENTS_CONSTANTS.ROLES.CAN_VIEW_FINANCIAL_REPORTS)
  @ApiOperation({ summary: 'Аналитика платежей' })
  @ApiResponse({ status: HttpStatus.OK, type: PaymentStatisticsDto })
  @Throttle({ default: { limit: 20, ttl: 3600000 } })
  async getPaymentStatistics(@Request() req: RequestWithUser): Promise<PaymentStatisticsDto> {
    this.logger.log(`Getting payment statistics for company ${req.user.companyId}`);
    return this.paymentsService.getPaymentStatistics(req.user);
  }

  @Get('analytics/balance')
  @Roles(...PAYMENTS_CONSTANTS.ROLES.CAN_VIEW_COMPANY_BALANCE)
  @ApiOperation({ summary: 'Финансовый баланс компании' })
  @ApiResponse({ status: HttpStatus.OK, type: CompanyBalanceDto })
  @Throttle({ default: { limit: 30, ttl: 3600000 } })
  async getCompanyBalance(@Request() req: RequestWithUser): Promise<CompanyBalanceDto> {
    this.logger.log(`Getting company balance for ${req.user.companyId}`);
    return this.paymentsService.getCompanyBalance(req.user);
  }

  @Delete(':id')
  @Roles('superadmin', 'company_owner', 'company_admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '🚨 Удалить платеж (ОПАСНО)' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  @Throttle({ default: { limit: 5, ttl: 3600000 } })
  async deletePayment(@Param('id', ParseUUIDPipe) id: string, @Request() req: RequestWithUser): Promise<void> {
    this.logger.log(`Deleting payment ${id} for company ${req.user.companyId}`);
    return this.paymentsService.deletePayment(id, req.user);
  }

  @Post('system/process-overdue')
  @Roles('superadmin', 'company_owner', 'company_admin')
  @ApiOperation({ summary: '🤖 Обработать просроченные платежи' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '✅ Просроченные платежи обработаны',
    schema: {
      type: 'object',
      properties: {
        processed: { type: 'number', example: 15 },
        expired: { type: 'number', example: 12 },
        cancelled: { type: 'number', example: 3 },
      },
    },
  })
  @ApiTooManyRequestsResponse({ description: '⚠️ Слишком много запросов (лимит: 3 в час)' })
  @ApiInternalServerErrorResponse({ description: '❌ Ошибка при обработке просроченных платежей' })
  @Throttle({ default: { limit: 3, ttl: 3600000 } })
  async processOverduePayments(
    @Request() req: RequestWithUser,
  ): Promise<{ processed: number; expired: number; cancelled: number }> {
    this.logger.log(`Processing overdue payments for company ${req.user.companyId}`);
    return this.paymentsService.processOverduePayments(req.user);
  }
}
