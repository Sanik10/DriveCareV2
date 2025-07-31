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
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto, CreateInvoiceFromOrderDto } from './dto/request/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/request/update-invoice.dto';
import { InvoiceResponseDto } from './dto/response/invoice-response.dto';
import { PaginatedInvoicesResponseDto } from './dto/response/paginated-invoices-response.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { RequestWithUser } from '../auth/interfaces/request-with-user.interface';
import { AuthWithOwnership, InvoiceResource } from '../../common';
import { InvoiceFilter, InvoiceStatus } from './types/invoices.types';
import { INVOICES_CONSTANTS } from './constants/invoices.constants';

@ApiTags('🧾 Управление счетами')
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  /**
   * 🔒 Создание счета - только для своей компании
   */
  @Post()
  @AuthWithOwnership()
  @Roles('owner', 'admin', 'manager')
  @ApiOperation({ 
    summary: 'Создание нового счета',
    description: 'Создание счета для компании пользователя. Владельцы, админы и менеджеры могут создавать счета.'
  })
  @ApiBody({ type: CreateInvoiceDto })
  @ApiResponse({ status: HttpStatus.CREATED, type: InvoiceResponseDto })
  @ApiBadRequestResponse({ description: '❌ Некорректные данные валидации' })
  @ApiUnauthorizedResponse({ description: '❌ Требуется авторизация' })
  @ApiForbiddenResponse({ description: '❌ Недостаточно прав доступа' })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async create(
    @Body() createInvoiceDto: CreateInvoiceDto,
    @Req() req: RequestWithUser,
  ): Promise<InvoiceResponseDto> {
    return this.invoicesService.createForUser(createInvoiceDto, req.user);
  }

  /**
   * 🎯 Создание счета из заказа (умная генерация)
   */
  @Post('from-order')
  @AuthWithOwnership()
  @Roles('owner', 'admin', 'manager')
  @ApiOperation({ 
    summary: 'Создание счета из заказа',
    description: 'Автоматическое создание счета на основе завершенного заказа с расчетом сумм.'
  })
  @ApiBody({ type: CreateInvoiceFromOrderDto })
  @ApiResponse({ status: HttpStatus.CREATED, type: InvoiceResponseDto })
  @ApiBadRequestResponse({ description: '❌ Заказ не найден или не завершен' })
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async createFromOrder(
    @Body() createFromOrderDto: CreateInvoiceFromOrderDto,
    @Req() req: RequestWithUser,
  ): Promise<InvoiceResponseDto> {
    return this.invoicesService.createFromOrder(createFromOrderDto, req.user);
  }

  /**
   * 🔒 Список счетов - только своих
   */
  @Get()
  @AuthWithOwnership()
  @ApiOperation({ 
    summary: 'Получение списка счетов',
    description: 'Получение списка счетов с фильтрацией. Суперадмин видит все, остальные - только счета своей компании.'
  })
  @ApiQuery({ name: 'orderId', required: false, description: 'ID заказа' })
  @ApiQuery({ name: 'customerId', required: false, description: 'ID клиента' })
  @ApiQuery({ name: 'status', required: false, enum: InvoiceStatus, description: 'Статус счета' })
  @ApiQuery({ name: 'dateFrom', required: false, description: 'Дата выставления с' })
  @ApiQuery({ name: 'dateTo', required: false, description: 'Дата выставления по' })
  @ApiQuery({ name: 'dueDateFrom', required: false, description: 'Срок оплаты с' })
  @ApiQuery({ name: 'dueDateTo', required: false, description: 'Срок оплаты по' })
  @ApiQuery({ name: 'amountFrom', required: false, description: 'Сумма от' })
  @ApiQuery({ name: 'amountTo', required: false, description: 'Сумма до' })
  @ApiQuery({ name: 'search', required: false, description: 'Поиск по номеру счета или примечаниям' })
  @ApiQuery({ name: 'includeOverdue', required: false, description: 'Только просроченные (true) или исключить просроченные (false)' })
  @ApiQuery({ name: 'page', required: false, description: 'Номер страницы' })
  @ApiQuery({ name: 'limit', required: false, description: 'Размер страницы' })
  @ApiResponse({ status: HttpStatus.OK, type: PaginatedInvoicesResponseDto })
  @ApiUnauthorizedResponse({ description: '❌ Требуется авторизация' })
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
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(INVOICES_CONSTANTS.DEFAULTS.PAGE_SIZE), ParseIntPipe) limit: number = INVOICES_CONSTANTS.DEFAULTS.PAGE_SIZE,
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

  /**
   * 🔒 Получение счета по ID с проверкой принадлежности
   */
  @Get(':id')
  @AuthWithOwnership()
  @InvoiceResource()
  @ApiOperation({ 
    summary: 'Получение счета по ID',
    description: 'Получение детальной информации о счете с связанными данными.'
  })
  @ApiParam({ name: 'id', description: 'ID счета' })
  @ApiResponse({ status: HttpStatus.OK, type: InvoiceResponseDto })
  @ApiNotFoundResponse({ description: '❌ Счет не найден или нет доступа' })
  @Throttle({ default: { limit: 50, ttl: 60000 } })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<InvoiceResponseDto> {
    return this.invoicesService.findOne(id);
  }

  /**
   * 🔒 Обновление счета с проверкой принадлежности
   */
  @Patch(':id')
  @AuthWithOwnership()
  @InvoiceResource()
  @Roles('owner', 'admin', 'manager')
  @ApiOperation({ 
    summary: 'Обновление счета',
    description: 'Обновление информации о счете. Доступно владельцам, админам и менеджерам.'
  })
  @ApiParam({ name: 'id', description: 'ID счета' })
  @ApiBody({ type: UpdateInvoiceDto })
  @ApiResponse({ status: HttpStatus.OK, type: InvoiceResponseDto })
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateInvoiceDto: UpdateInvoiceDto,
    @Req() req: RequestWithUser,
  ): Promise<InvoiceResponseDto> {
    return this.invoicesService.update(id, updateInvoiceDto, req.user);
  }

  /**
   * 🔒 Изменение статуса счета
   */
  @Patch(':id/status')
  @AuthWithOwnership()
  @InvoiceResource()
  @Roles('owner', 'admin', 'manager')
  @ApiOperation({ 
    summary: 'Изменение статуса счета',
    description: 'Изменение статуса счета в рамках workflow.'
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

  /**
   * 🔒 Отмена счета
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @AuthWithOwnership()
  @InvoiceResource()
  @Roles('owner', 'admin', 'manager')
  @ApiOperation({ 
    summary: 'Отмена счета',
    description: 'Отмена счета (изменение статуса на CANCELED).'
  })
  @ApiParam({ name: 'id', description: 'ID счета' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: RequestWithUser,
  ): Promise<void> {
    return this.invoicesService.cancel(id, req.user);
  }

  /**
   * 📊 Статистика по счетам
   */
  @Get('stats/dashboard')
  @AuthWithOwnership()
  @Roles('owner', 'admin', 'manager')
  @ApiOperation({ 
    summary: 'Статистика по счетам',
    description: 'Получение статистики по счетам компании для дашборда.'
  })
  @ApiResponse({ status: HttpStatus.OK })
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async getStatistics(@Req() req: RequestWithUser) {
    return this.invoicesService.getStatistics(req.user);
  }

  /**
   * 🚨 Просроченные счета
   */
  @Get('overdue/report')
  @AuthWithOwnership()
  @Roles('owner', 'admin', 'manager')
  @ApiOperation({ 
    summary: 'Отчет по просроченным счетам',
    description: 'Получение детального отчета по просроченным счетам.'
  })
  @ApiResponse({ status: HttpStatus.OK })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async getOverdueReport(@Req() req: RequestWithUser) {
    return this.invoicesService.getOverdueInvoices(req.user);
  }

  /**
   * 🔍 Поиск счетов
   */
  @Get('search/:query')
  @AuthWithOwnership()
  @ApiOperation({ 
    summary: 'Поиск счетов',
    description: 'Быстрый поиск счетов по номеру или примечаниям.'
  })
  @ApiParam({ name: 'query', description: 'Поисковый запрос' })
  @ApiResponse({ status: HttpStatus.OK, type: [InvoiceResponseDto] })
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async search(
    @Param('query') query: string,
    @Req() req: RequestWithUser,
  ): Promise<InvoiceResponseDto[]> {
    return this.invoicesService.search(query, req.user);
  }

  /**
   * 📋 Счета для dropdown/select
   */
  @Get('select/options')
  @AuthWithOwnership()
  @ApiOperation({ 
    summary: 'Счета для dropdown',
    description: 'Получение списка счетов в формате для dropdown/select компонентов.'
  })
  @ApiQuery({ name: 'status', required: false, enum: InvoiceStatus, description: 'Фильтр по статусу' })
  @ApiResponse({ status: HttpStatus.OK })
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async getForSelect(
    @Req() req: RequestWithUser,
    @Query('status') status?: InvoiceStatus,
  ) {
    return this.invoicesService.getForSelect(req.user, { status });
  }
}
