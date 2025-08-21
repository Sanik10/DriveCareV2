// src/modules/invoices/invoices.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  DefaultValuePipe,
  ParseIntPipe,
  Req,
  ParseEnumPipe,
  UseGuards,
  UseInterceptors,
  UsePipes,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuditLoggingInterceptor } from '../../common/interceptors/audit-logging.interceptor';
import { EnhancedValidationPipe } from '../../common/pipes/enhanced-validation.pipe';
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto, CreateInvoiceFromOrderDto } from './dto/request/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/request/update-invoice.dto';
import { InvoiceResponseDto } from './dto/response/invoice-response.dto';
import { PaginatedInvoicesResponseDto } from './dto/response/paginated-invoices-response.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { RequestWithUser } from '../auth/interfaces/request-with-user.interface';
import { InvoiceFilter, InvoiceStatus } from './types/invoices.types';
import { INVOICES_CONSTANTS } from './constants/invoices.constants';

@ApiTags('🧾 Управление счетами')
@Controller('invoices')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditLoggingInterceptor)
@UsePipes(EnhancedValidationPipe)
@ApiBearerAuth('JWT-auth')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Post()
  @Roles('company_owner', 'company_admin', 'manager')
  @ApiOperation({
    summary: 'Создание нового счета',
    description:
      'Создание счета для компании пользователя. Доступно владельцам, админам и менеджерам. Кассиры НЕ могут создавать счета.',
  })
  @ApiBody({ type: CreateInvoiceDto })
  @ApiResponse({ status: HttpStatus.CREATED, type: InvoiceResponseDto })
  @ApiBadRequestResponse({ description: '❌ Некорректные данные валидации' })
  @ApiUnauthorizedResponse({ description: '❌ Требуется авторизация' })
  @ApiForbiddenResponse({ description: '❌ Недостаточно прав доступа' })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async create(@Body() dto: CreateInvoiceDto, @Req() req: RequestWithUser): Promise<InvoiceResponseDto> {
    return this.invoicesService.createForUser(dto, req.user);
  }

  @Post('from-order')
  @Roles('company_owner', 'company_admin', 'manager')
  @ApiOperation({
    summary: 'Создание счета из заказа',
    description: 'Автоматическое создание счета на основе завершенного заказа с расчетом сумм.',
  })
  @ApiBody({ type: CreateInvoiceFromOrderDto })
  @ApiResponse({ status: HttpStatus.CREATED, type: InvoiceResponseDto })
  @ApiBadRequestResponse({ description: '❌ Заказ не найден или не завершен' })
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async createFromOrder(@Body() dto: CreateInvoiceFromOrderDto, @Req() req: RequestWithUser): Promise<InvoiceResponseDto> {
    return this.invoicesService.createFromOrder(dto, req.user);
  }

  @Get()
  @Roles('company_owner', 'company_admin', 'manager', 'cashier')
  @ApiOperation({
    summary: 'Получение списка счетов',
    description:
      'Получение списка счетов с фильтрацией. Суперадмин видит все, остальные — только своей компании. Кассиры видят для работы с платежами.',
  })
  @ApiResponse({ status: HttpStatus.OK, type: PaginatedInvoicesResponseDto })
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async findAll(
    @Req() req: RequestWithUser,
    @Query('orderId') orderId?: string,
    @Query('customerId') customerId?: string,
    @Query('status') status?: InvoiceStatus,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('dueDateFrom') dueDateFrom?: string,
    @Query('dueDateTo') dueDateTo?: string,
    @Query('amountFrom') amountFrom?: number,
    @Query('amountTo') amountTo?: number,
    @Query('search') search?: string,
    @Query('includeOverdue') includeOverdue?: boolean,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('limit', new DefaultValuePipe(INVOICES_CONSTANTS.DEFAULTS.PAGE_SIZE), ParseIntPipe) limit = INVOICES_CONSTANTS.DEFAULTS.PAGE_SIZE,
  ): Promise<PaginatedInvoicesResponseDto> {
    const filter: InvoiceFilter = {
      orderId,
      customerId,
      status,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
      dueDateFrom: dueDateFrom ? new Date(dueDateFrom) : undefined,
      dueDateTo: dueDateTo ? new Date(dueDateTo) : undefined,
      amountFrom,
      amountTo,
      search,
      includeOverdue,
      page,
      limit: Math.min(limit, INVOICES_CONSTANTS.DEFAULTS.MAX_ITEMS),
    };
    return this.invoicesService.findAll(filter, req.user);
  }

  @Get(':id')
  @Roles('company_owner', 'company_admin', 'manager', 'cashier')
  @ApiOperation({ summary: 'Получение счета по ID', description: 'Детальная информация о счете с связанными данными.' })
  @ApiParam({ name: 'id', description: 'ID счета' })
  @ApiResponse({ status: HttpStatus.OK, type: InvoiceResponseDto })
  @ApiNotFoundResponse({ description: '❌ Счет не найден или нет доступа' })
  @Throttle({ default: { limit: 50, ttl: 60000 } })
  async findOne(@Param('id', ParseUUIDPipe) id: string, @Req() req: RequestWithUser): Promise<InvoiceResponseDto> {
    return this.invoicesService.findOne(id, req.user);
  }

  @Patch(':id')
  @Roles('company_owner', 'company_admin', 'manager')
  @ApiOperation({
    summary: 'Обновление счета',
    description: 'Редактирование информации о счете. Кассиры НЕ могут редактировать счета.',
  })
  @ApiParam({ name: 'id', description: 'ID счета' })
  @ApiBody({ type: UpdateInvoiceDto })
  @ApiResponse({ status: HttpStatus.OK, type: InvoiceResponseDto })
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateInvoiceDto, @Req() req: RequestWithUser): Promise<InvoiceResponseDto> {
    return this.invoicesService.update(id, dto, req.user);
  }

  @Patch(':id/status')
  @Roles('company_owner', 'company_admin', 'manager') // cashier убран
  @ApiOperation({
    summary: 'Изменение статуса счета',
    description: 'Изменение статуса счета в рамках workflow. Доступно manager+.',
  })
  @ApiParam({ name: 'id', description: 'ID счета' })
  @ApiQuery({ name: 'status', enum: InvoiceStatus, description: 'Новый статус счета' })
  @ApiResponse({ status: HttpStatus.OK, type: InvoiceResponseDto })
  @Throttle({ default: { limit: 15, ttl: 60000 } })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('status', new ParseEnumPipe(InvoiceStatus)) status: InvoiceStatus,
    @Req() req: RequestWithUser,
  ): Promise<InvoiceResponseDto> {
    return this.invoicesService.updateStatus(id, status, req.user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles('company_owner', 'company_admin', 'manager')
  @ApiOperation({ summary: 'Отмена счета', description: 'Отмена счета (статус CANCELED). Кассиры НЕ могут отменять счета.' })
  @ApiParam({ name: 'id', description: 'ID счета' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async cancel(@Param('id', ParseUUIDPipe) id: string, @Req() req: RequestWithUser): Promise<void> {
    return this.invoicesService.cancel(id, req.user);
  }

  @Get('stats/dashboard')
  @Roles('company_owner', 'company_admin', 'manager')
  @ApiOperation({
    summary: 'Статистика по счетам',
    description: 'Аналитика по счетам компании для дашборда. Кассиры не видят фин. статистику.',
  })
  @ApiResponse({ status: HttpStatus.OK })
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async getStatistics(@Req() req: RequestWithUser) {
    return this.invoicesService.getStatistics(req.user);
  }

  @Get('overdue/report')
  @Roles('company_owner', 'company_admin', 'manager')
  @ApiOperation({ summary: 'Отчет по просроченным счетам', description: 'Детальный отчет по просроченным счетам.' })
  @ApiResponse({ status: HttpStatus.OK })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async getOverdueReport(@Req() req: RequestWithUser) {
    return this.invoicesService.getOverdueInvoices(req.user);
  }

  @Get('search/:query')
  @Roles('company_owner', 'company_admin', 'manager', 'cashier')
  @ApiOperation({ summary: 'Поиск счетов', description: 'Быстрый поиск по номеру счета или примечаниям.' })
  @ApiParam({ name: 'query', description: 'Поисковый запрос' })
  @ApiResponse({ status: HttpStatus.OK, type: [InvoiceResponseDto] })
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async search(@Param('query') query: string, @Req() req: RequestWithUser): Promise<InvoiceResponseDto[]> {
    return this.invoicesService.search(query, req.user);
  }

  @Get('select/options')
  @Roles('company_owner', 'company_admin', 'manager', 'cashier')
  @ApiOperation({
    summary: 'Счета для dropdown',
    description: 'Список счетов в формате для select-компонентов.',
  })
  @ApiQuery({ name: 'status', required: false, enum: InvoiceStatus, description: 'Фильтр по статусу' })
  @ApiResponse({ status: HttpStatus.OK })
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async getForSelect(@Req() req: RequestWithUser, @Query('status') status?: InvoiceStatus) {
    return this.invoicesService.getForSelect(req.user, { status });
  }
}
