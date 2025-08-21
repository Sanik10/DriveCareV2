// path: apps/backend/src/modules/payment-methods/payment-methods.controller.ts
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  HttpStatus,
  HttpCode,
  DefaultValuePipe,
  ParseIntPipe,
  ParseUUIDPipe,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
  ApiBody,
  ApiBearerAuth,
  ApiSecurity,
  ApiUnauthorizedResponse,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthWithOwnership, PaymentMethodResource } from '../../common';
import { Roles } from '../auth/decorators/roles.decorator';
import { RequestWithUser } from '../auth/interfaces/request-with-user.interface';
import { PaymentMethodsService } from './payment-methods.service';
import { CreatePaymentMethodDto } from './dto/request/create-payment-method.dto';
import { UpdatePaymentMethodDto } from './dto/request/update-payment-method.dto';
import { PaymentMethodResponseDto } from './dto/response/payment-method-response.dto';
import { PaginatedPaymentMethodsResponseDto } from './dto/response/paginated-payment-methods-response.dto';
import {
  PaymentMethodsFilter,
  PaymentMethodType,
  PaymentMethodSortBy,
  SortOrder,
} from './types/payment-methods.types';
import { EnhancedValidationPipe } from '../../common/pipes/enhanced-validation.pipe';
import { PAYMENT_METHODS_CONSTANTS } from './constants/payment-methods.constants';

@ApiTags('💳 Способы оплаты')
@ApiBearerAuth()
@ApiSecurity('JWT')
@Controller('payment-methods')
@AuthWithOwnership()
export class PaymentMethodsController {
  private readonly logger = new Logger(PaymentMethodsController.name);

  constructor(private readonly paymentMethodsService: PaymentMethodsService) {}

  private parseBoolOptional(v: unknown): boolean | undefined {
    if (v === undefined || v === null || v === '') return undefined;
    if (typeof v === 'boolean') return v;
    const s = String(v).toLowerCase();
    if (s === 'true') return true;
    if (s === 'false') return false;
    return undefined;
  }

  private normalizeSortBy(v?: string): PaymentMethodSortBy {
    const allowed: PaymentMethodSortBy[] = ['name', 'type', 'createdAt', 'updatedAt', 'transactionCount'];
    return allowed.includes(v as PaymentMethodSortBy) ? (v as PaymentMethodSortBy) : 'name';
  }

  private normalizeSortOrder(v?: string): SortOrder {
    const s = (v || 'ASC').toString().toUpperCase();
    return s === 'DESC' ? 'DESC' : 'ASC';
  }

  @Get()
  @ApiOperation({ summary: 'Получить способы оплаты компании' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'search', required: false, type: String, example: 'карта' })
  @ApiQuery({ name: 'type', required: false, enum: PaymentMethodType, example: 'card' })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean, example: true })
  @ApiQuery({ name: 'supportsRefunds', required: false, type: Boolean, example: true })
  @ApiQuery({ name: 'requiresVerification', required: false, type: Boolean, example: false })
  @ApiQuery({ name: 'hasIntegration', required: false, type: Boolean, example: true })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: ['name', 'type', 'createdAt', 'updatedAt', 'transactionCount'],
    example: 'name',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    enum: ['ASC', 'DESC'],
    example: 'ASC',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '✅ Список способов оплаты получен',
    type: PaginatedPaymentMethodsResponseDto,
  })
  @ApiUnauthorizedResponse({ description: '❌ Требуется авторизация' })
  @ApiTooManyRequestsResponse({ description: '⚠️ Слишком много запросов (лимит: 100 в минуту)' })
  @Throttle({ default: { limit: 100, ttl: 60000 } })
  async findAll(
    @Req() req: RequestWithUser,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(PAYMENT_METHODS_CONSTANTS.DEFAULT_PAGE_SIZE), ParseIntPipe) limit: number,
    @Query('search') search?: string,
    @Query('type') type?: PaymentMethodType,
    @Query('isActive', new DefaultValuePipe(undefined)) isActiveQ?: unknown,
    @Query('supportsRefunds', new DefaultValuePipe(undefined)) supportsRefundsQ?: unknown,
    @Query('requiresVerification', new DefaultValuePipe(undefined)) requiresVerificationQ?: unknown,
    @Query('hasIntegration', new DefaultValuePipe(undefined)) hasIntegrationQ?: unknown,
    @Query('sortBy', new DefaultValuePipe(PAYMENT_METHODS_CONSTANTS.DEFAULT_SORT_BY)) sortBy?: string,
    @Query('sortOrder', new DefaultValuePipe('ASC')) sortOrder?: string,
  ): Promise<PaginatedPaymentMethodsResponseDto> {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(Math.max(1, limit), 50);

    const filter: PaymentMethodsFilter = {
      page: safePage,
      limit: safeLimit,
      search,
      type,
      isActive: this.parseBoolOptional(isActiveQ),
      supportsRefunds: this.parseBoolOptional(supportsRefundsQ),
      requiresVerification: this.parseBoolOptional(requiresVerificationQ),
      hasIntegration: this.parseBoolOptional(hasIntegrationQ),
      sortBy: this.normalizeSortBy(sortBy),
      sortOrder: this.normalizeSortOrder(sortOrder),
    };

    this.logger.log(`List payment methods company=${req.user.companyId} page=${safePage} limit=${safeLimit}`);
    return this.paymentMethodsService.findAllForUser(req.user, filter);
  }

  @Get('stats')
  @Roles('company_admin', 'manager', 'company_owner', 'superadmin')
  @ApiOperation({ summary: 'Статистика способов оплаты' })
  @ApiResponse({ status: HttpStatus.OK, description: '✅ Статистика получена' })
  @Throttle({ default: { limit: 30, ttl: 3600000 } })
  async getStats(@Req() req: RequestWithUser): Promise<any> {
    return this.paymentMethodsService.getStats(req.user);
  }

  @Get('search')
  @ApiOperation({ summary: 'Поиск способов оплаты' })
  @ApiQuery({ name: 'q', required: true, type: String, example: 'сбер' })
  @ApiResponse({ status: HttpStatus.OK, type: [PaymentMethodResponseDto] })
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  async search(@Query('q') query: string, @Req() req: RequestWithUser): Promise<PaymentMethodResponseDto[]> {
    if (!query || query.trim().length < 2) {
      throw new BadRequestException('Search query must be at least 2 characters long');
    }
    return this.paymentMethodsService.search(query.trim(), req.user);
  }

  @Get('quick')
  @ApiOperation({ summary: 'Активные способы оплаты для быстрого доступа' })
  @ApiResponse({ status: HttpStatus.OK })
  @Throttle({ default: { limit: 120, ttl: 60000 } })
  async getActiveQuick(
    @Req() req: RequestWithUser,
  ): Promise<Array<{ id: string; name: string; type: string; isActive: boolean; processingFee?: number }>> {
    return this.paymentMethodsService.getActiveQuick(req.user);
  }

  @Get('for-select')
  @ApiOperation({ summary: 'Способы оплаты для select/dropdown' })
  @ApiResponse({ status: HttpStatus.OK })
  @Throttle({ default: { limit: 150, ttl: 60000 } })
  async getForSelect(
    @Req() req: RequestWithUser,
  ): Promise<Array<{ value: string; label: string; disabled?: boolean; meta?: any }>> {
    return this.paymentMethodsService.getForSelect(req.user);
  }

  @Get('type/:type')
  @ApiOperation({ summary: 'Получить способы оплаты по типу' })
  @ApiParam({ name: 'type', enum: PaymentMethodType, example: 'card' })
  @ApiResponse({ status: HttpStatus.OK, type: [PaymentMethodResponseDto] })
  @Throttle({ default: { limit: 80, ttl: 60000 } })
  async findByType(@Param('type') type: PaymentMethodType, @Req() req: RequestWithUser): Promise<PaymentMethodResponseDto[]> {
    return this.paymentMethodsService.findByType(type, req.user);
  }

  @Get(':id')
  @PaymentMethodResource()
  @ApiOperation({ summary: 'Получить способ оплаты по ID' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: HttpStatus.OK, type: PaymentMethodResponseDto })
  @Throttle({ default: { limit: 200, ttl: 60000 } })
  async findOne(@Param('id', ParseUUIDPipe) id: string, @Req() req: RequestWithUser): Promise<PaymentMethodResponseDto> {
    return this.paymentMethodsService.findOneForUser(id, req.user);
  }

  @Get(':id/availability')
  @PaymentMethodResource()
  @ApiOperation({ summary: 'Проверить доступность способа оплаты' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: HttpStatus.OK })
  @Throttle({ default: { limit: 300, ttl: 60000 } })
  async checkAvailability(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: RequestWithUser,
  ): Promise<{ available: boolean; paymentMethod?: PaymentMethodResponseDto; reason?: string }> {
    return this.paymentMethodsService.checkAvailability(id, req.user);
  }

  @Get(':id/limits')
  @PaymentMethodResource()
  @Roles('company_admin', 'manager', 'company_owner', 'superadmin')
  @ApiOperation({ summary: 'Получить лимиты способа оплаты' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: HttpStatus.OK })
  @Throttle({ default: { limit: 50, ttl: 60000 } })
  async getLimits(@Param('id', ParseUUIDPipe) id: string, @Req() req: RequestWithUser): Promise<any> {
    return this.paymentMethodsService.getPaymentMethodLimits(id, req.user.companyId);
  }

  @Post()
  @Roles('company_owner', 'company_admin')
  @ApiOperation({ summary: 'Создать новый способ оплаты' })
  @ApiBody({ type: CreatePaymentMethodDto })
  @ApiResponse({ status: HttpStatus.CREATED, type: PaymentMethodResponseDto })
  @Throttle({ default: { limit: 10, ttl: 3600000 } })
  async create(@Body(EnhancedValidationPipe) dto: CreatePaymentMethodDto, @Req() req: RequestWithUser): Promise<PaymentMethodResponseDto> {
    return this.paymentMethodsService.createForUser(dto, req.user);
  }

  @Post('bulk-update')
  @Roles('company_owner', 'company_admin')
  @ApiOperation({ summary: 'Массовое обновление способов оплаты' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        paymentMethodIds: { type: 'array', items: { type: 'string', format: 'uuid' } },
        updates: { $ref: '#/components/schemas/UpdatePaymentMethodDto' },
      },
      required: ['paymentMethodIds', 'updates'],
    },
  })
  @ApiResponse({ status: HttpStatus.OK })
  @Throttle({ default: { limit: 5, ttl: 3600000 } })
  async bulkUpdate(
    @Body(EnhancedValidationPipe) dto: { paymentMethodIds: string[]; updates: UpdatePaymentMethodDto },
    @Req() req: RequestWithUser,
  ): Promise<{ updated: number; failed: number; message: string }> {
    return this.paymentMethodsService.bulkUpdate(dto.paymentMethodIds, dto.updates, req.user);
  }

  @Post(':id/test-integration')
  @PaymentMethodResource()
  @Roles('company_owner', 'company_admin', 'manager')
  @ApiOperation({ summary: 'Тестировать интеграцию способа оплаты' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: HttpStatus.OK })
  @Throttle({ default: { limit: 20, ttl: 3600000 } })
  async testIntegration(@Param('id', ParseUUIDPipe) id: string, @Req() req: RequestWithUser): Promise<any> {
    return this.paymentMethodsService.testIntegration(id, req.user);
  }

  @Post(':id/calculate-fee')
  @PaymentMethodResource()
  @ApiOperation({ summary: 'Рассчитать комиссию за платеж' })
  @ApiParam({ name: 'id', type: String })
  @ApiBody({
    schema: { type: 'object', properties: { amount: { type: 'number', minimum: 0.01 } }, required: ['amount'] },
  })
  @ApiResponse({ status: HttpStatus.OK })
  @Throttle({ default: { limit: 500, ttl: 3600000 } })
  async calculateFee(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(EnhancedValidationPipe) dto: { amount: number },
    @Req() req: RequestWithUser,
  ): Promise<{ amount: number; fee: number; totalAmount: number; feePercentage: number }> {
    return this.paymentMethodsService.calculateProcessingFee(id, dto.amount, req.user.companyId);
  }

  @Patch(':id')
  @PaymentMethodResource()
  @Roles('company_owner', 'company_admin')
  @ApiOperation({ summary: 'Обновить способ оплаты' })
  @ApiParam({ name: 'id', type: String })
  @ApiBody({ type: UpdatePaymentMethodDto })
  @ApiResponse({ status: HttpStatus.OK, type: PaymentMethodResponseDto })
  @Throttle({ default: { limit: 30, ttl: 3600000 } })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(EnhancedValidationPipe) dto: UpdatePaymentMethodDto,
    @Req() req: RequestWithUser,
  ): Promise<PaymentMethodResponseDto> {
    return this.paymentMethodsService.update(id, dto, req.user);
  }

  @Post(':id/toggle-status')
  @PaymentMethodResource()
  @Roles('company_owner', 'company_admin')
  @ApiOperation({ summary: 'Переключить статус активности' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: HttpStatus.OK, type: PaymentMethodResponseDto })
  @Throttle({ default: { limit: 50, ttl: 3600000 } })
  async toggleStatus(@Param('id', ParseUUIDPipe) id: string, @Req() req: RequestWithUser): Promise<PaymentMethodResponseDto> {
    return this.paymentMethodsService.toggleStatus(id, req.user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @PaymentMethodResource()
  @Roles('company_owner', 'company_admin')
  @ApiOperation({ summary: 'Удалить способ оплаты (необратимо)' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  @Throttle({ default: { limit: 5, ttl: 3600000 } })
  async remove(@Param('id', ParseUUIDPipe) id: string, @Req() req: RequestWithUser): Promise<void> {
    await this.paymentMethodsService.remove(id, req.user);
  }
}
