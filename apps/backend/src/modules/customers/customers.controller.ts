// path: apps/backend/src/modules/customers/customers.controller.ts
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
  DefaultValuePipe,
  ParseIntPipe,
  Req,
  ParseEnumPipe,
  Res,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiQuery,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/request/create-customer.dto';
import { UpdateCustomerDto } from './dto/request/update-customer.dto';
import { RevokeCustomerConsentDto } from './dto/request/revoke-consent.dto';
import { CustomerResponseDto } from './dto/response/customer-response.dto';
import { PaginatedCustomersResponseDto } from './dto/response/paginated-customers-response.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { RequestWithUser } from '../auth/interfaces/request-with-user.interface';
import { CustomerFilter, CustomerSortField, SortOrder } from './types/customers.types';
import { CUSTOMERS_CONSTANTS } from './constants/customers.constants';
import { AuthWithOwnership, CustomerResource } from '../../common';
import { CustomerType } from '../../database/entities';
import { Response } from 'express';

@ApiTags('👥 Управление клиентами')
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  @AuthWithOwnership()
  @Roles('owner', 'admin', 'manager')
  @ApiOperation({ summary: 'Создание нового клиента', description: 'Создание клиента для компании пользователя. Доступно владельцам, админам и менеджерам.' })
  @ApiBody({ type: CreateCustomerDto })
  @ApiResponse({ status: HttpStatus.CREATED, type: CustomerResponseDto })
  @ApiConflictResponse({ description: 'Клиент с таким email уже существует в компании' })
  @ApiBadRequestResponse({ description: 'Некорректные данные или превышен лимит клиентов' })
  @ApiUnauthorizedResponse({ description: 'Требуется авторизация' })
  @ApiForbiddenResponse({ description: 'Недостаточно прав доступа' })
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async create(@Body() createCustomerDto: CreateCustomerDto, @Req() req: RequestWithUser): Promise<CustomerResponseDto> {
    return this.customersService.createForUser(createCustomerDto, req.user);
  }

  @Get()
  @AuthWithOwnership()
  @ApiOperation({ summary: 'Получение списка клиентов', description: 'Получение списка клиентов с фильтрацией и пагинацией. Каждый видит только клиентов своей компании.' })
  @ApiQuery({ name: 'search', required: false, description: 'Поиск по имени, email, телефону' })
  @ApiQuery({ name: 'type', required: false, description: 'Тип клиента (individual/company)', enum: CustomerType })
  @ApiQuery({ name: 'isActive', required: false, description: 'Статус активности (true/false)' })
  @ApiQuery({ name: 'source', required: false, description: 'Источник привлечения' })
  @ApiQuery({ name: 'page', required: false, description: 'Номер страницы' })
  @ApiQuery({ name: 'limit', required: false, description: 'Размер страницы' })
  @ApiQuery({ name: 'sortField', required: false, description: 'Поле для сортировки', enum: ['firstName', 'lastName', 'email', 'createdAt', 'loyaltyPoints', 'companyName'] })
  @ApiQuery({ name: 'sortOrder', required: false, description: 'Порядок сортировки', enum: ['asc', 'desc'] })
  @ApiResponse({ status: HttpStatus.OK, type: PaginatedCustomersResponseDto })
  @ApiUnauthorizedResponse({ description: 'Требуется авторизация' })
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async findAll(
    @Req() req: RequestWithUser,
    @Query('search') search?: string,
    @Query('type', new DefaultValuePipe(undefined), new ParseEnumPipe(CustomerType, { optional: true })) type?: CustomerType,
    @Query('isActive') isActiveParam?: string,
    @Query('source') source?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(CUSTOMERS_CONSTANTS.DEFAULTS.PAGE_SIZE), ParseIntPipe) limit: number = CUSTOMERS_CONSTANTS.DEFAULTS.PAGE_SIZE,
    @Query('sortField', new DefaultValuePipe('createdAt')) sortField: string = 'createdAt',
    @Query('sortOrder', new DefaultValuePipe('desc')) sortOrder: string = 'desc',
  ): Promise<PaginatedCustomersResponseDto> {
    let isActive: boolean | undefined = undefined;
    if (typeof isActiveParam === 'string') {
      const v = isActiveParam.trim().toLowerCase();
      if (v === 'true' || v === '1') isActive = true;
      else if (v === 'false' || v === '0') isActive = false;
    }

    const allowedSortFields: CustomerSortField[] = ['firstName', 'lastName', 'email', 'createdAt', 'loyaltyPoints', 'companyName'];
    const allowedSortOrders: SortOrder[] = ['asc', 'desc'];
    const safeSortField: CustomerSortField = allowedSortFields.includes(sortField as CustomerSortField) ? (sortField as CustomerSortField) : 'createdAt';
    const safeSortOrder: SortOrder = allowedSortOrders.includes(sortOrder as SortOrder) ? (sortOrder as SortOrder) : 'desc';

    const filter: CustomerFilter = {
      search,
      type,
      isActive,
      source,
      page,
      limit: Math.min(limit, CUSTOMERS_CONSTANTS.DEFAULTS.MAX_ITEMS),
      sortField: safeSortField,
      sortOrder: safeSortOrder,
    };

    return this.customersService.findAllForUser(req.user, filter);
  }

  @Get(':id')
  @AuthWithOwnership()
  @CustomerResource()
  @ApiOperation({ summary: 'Получение клиента по ID', description: 'Получение детальной информации о клиенте с проверкой принадлежности к компании.' })
  @ApiParam({ name: 'id', description: 'ID клиента' })
  @ApiResponse({ status: HttpStatus.OK, type: CustomerResponseDto })
  @ApiNotFoundResponse({ description: 'Клиент не найден' })
  @ApiUnauthorizedResponse({ description: 'Требуется авторизация' })
  @ApiForbiddenResponse({ description: 'Нет доступа к клиенту' })
  @Throttle({ default: { limit: 50, ttl: 60_000 } })
  async findOne(@Param('id') id: string, @Req() req: RequestWithUser): Promise<CustomerResponseDto> {
    return this.customersService.findOneForUser(id, req.user);
  }

  @Patch(':id')
  @AuthWithOwnership()
  @CustomerResource()
  @Roles('owner', 'admin', 'manager')
  @ApiOperation({ summary: 'Обновление данных клиента', description: 'Обновление информации о клиенте с проверкой принадлежности к компании.' })
  @ApiParam({ name: 'id', description: 'ID клиента' })
  @ApiBody({ type: UpdateCustomerDto })
  @ApiResponse({ status: HttpStatus.OK, type: CustomerResponseDto })
  @ApiNotFoundResponse({ description: 'Клиент не найден' })
  @ApiConflictResponse({ description: 'Email уже используется другим клиентом' })
  @ApiBadRequestResponse({ description: 'Некорректные данные' })
  @ApiUnauthorizedResponse({ description: 'Требуется авторизация' })
  @ApiForbiddenResponse({ description: 'Недостаточно прав или нет доступа к клиенту' })
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async update(@Param('id') id: string, @Body() updateCustomerDto: UpdateCustomerDto): Promise<CustomerResponseDto> {
    return this.customersService.update(id, updateCustomerDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @AuthWithOwnership()
  @CustomerResource()
  @Roles('owner', 'admin')
  @ApiOperation({ summary: 'Деактивация/мягкое удаление клиента', description: 'Мягкое удаление клиента: пометка isDeleted=true, сохранение для ретеншна.' })
  @ApiParam({ name: 'id', description: 'ID клиента' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  @ApiNotFoundResponse({ description: 'Клиент не найден' })
  @ApiUnauthorizedResponse({ description: 'Требуется авторизация' })
  @ApiForbiddenResponse({ description: 'Недостаточно прав доступа' })
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async remove(@Param('id') id: string): Promise<void> {
    return this.customersService.remove(id);
  }

  @Delete(':id/hard')
  @HttpCode(HttpStatus.NO_CONTENT)
  @AuthWithOwnership()
  @CustomerResource()
  @Roles('superadmin')
  @ApiOperation({ summary: 'Полное удаление клиента (только суперадмин)', description: 'ОПАСНАЯ ОПЕРАЦИЯ! Полное удаление клиента из базы данных.' })
  @ApiParam({ name: 'id', description: 'ID клиента' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  @ApiNotFoundResponse({ description: 'Клиент не найден' })
  @ApiUnauthorizedResponse({ description: 'Требуется авторизация' })
  @ApiForbiddenResponse({ description: 'Доступно только суперадминистратору' })
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async hardRemove(@Param('id') id: string): Promise<void> {
    return this.customersService.hardRemove(id);
  }

  @Patch(':id/status')
  @AuthWithOwnership()
  @CustomerResource()
  @Roles('owner', 'admin')
  @ApiOperation({ summary: 'Изменение статуса активности клиента', description: 'Активация или деактивация клиента.' })
  @ApiParam({ name: 'id', description: 'ID клиента' })
  @ApiQuery({ name: 'isActive', type: Boolean, description: 'Новый статус' })
  @ApiResponse({ status: HttpStatus.OK, type: CustomerResponseDto })
  @Throttle({ default: { limit: 15, ttl: 60_000 } })
  async setActive(@Param('id') id: string, @Query('isActive') isActiveParam: string): Promise<CustomerResponseDto> {
    const v = (isActiveParam ?? '').toLowerCase();
    const isActive = v === 'true' || v === '1';
    return this.customersService.setActive(id, isActive);
  }

  @Get('stats/dashboard')
  @AuthWithOwnership()
  @Roles('owner', 'admin', 'manager')
  @ApiOperation({ summary: 'Статистика по клиентам', description: 'Получение статистики по клиентам для дашборда.' })
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async getStats(@Req() req: RequestWithUser): Promise<any> {
    return this.customersService.getStats(req.user.companyId!);
  }

  // === Права субъекта ПДн ===

  @Get(':id/export')
  @AuthWithOwnership()
  @CustomerResource()
  @Roles('owner', 'admin', 'manager')
  @ApiOperation({ summary: 'Экспорт ПДн клиента (152‑ФЗ)', description: 'Экспорт данных клиента и связанных авто. Выдаётся JSON-файл.' })
  @ApiParam({ name: 'id', description: 'ID клиента' })
  @ApiResponse({ status: HttpStatus.OK, description: 'JSON-экспорт' })
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async export(@Param('id') id: string, @Req() req: RequestWithUser, @Res() res: Response): Promise<void> {
    const data = await this.customersService.exportForUser(id, req.user, { ip: req.ip, ua: req.headers['user-agent'] as string });
    const fileName = `customer-${id}-export-${new Date().toISOString().slice(0,10)}.json`;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, private');
    res.status(HttpStatus.OK).send(JSON.stringify(data, null, 2));
  }

  @Post(':id/consent/revoke')
  @AuthWithOwnership()
  @CustomerResource()
  @Roles('owner', 'admin', 'manager')
  @ApiOperation({ summary: 'Отзыв согласия субъекта ПДн', description: 'Отозвать согласие на обработку ПДн/маркетинговые коммуникации для клиента.' })
  @ApiParam({ name: 'id', description: 'ID клиента' })
  @ApiBody({ type: RevokeCustomerConsentDto })
  @ApiResponse({ status: HttpStatus.OK, type: CustomerResponseDto })
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async revokeConsent(@Param('id') id: string, @Body() dto: RevokeCustomerConsentDto, @Req() req: RequestWithUser): Promise<CustomerResponseDto> {
    return this.customersService.revokeCustomerConsent(id, dto, req.user);
  }

  @Delete(':id/anonymize')
  @AuthWithOwnership()
  @CustomerResource()
  @Roles('owner', 'admin', 'manager')
  @ApiOperation({ summary: 'Анонимизация ПДн клиента (152‑ФЗ)', description: 'Анонимизация персональных данных клиента и связанных авто, без удаления первичных документов.' })
  @ApiParam({ name: 'id', description: 'ID клиента' })
  @ApiResponse({ status: HttpStatus.OK, type: CustomerResponseDto })
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async anonymize(@Param('id') id: string, @Req() req: RequestWithUser): Promise<CustomerResponseDto> {
    return this.customersService.anonymize(id, req.user, { ip: req.ip, ua: req.headers['user-agent'] as string });
  }
}
