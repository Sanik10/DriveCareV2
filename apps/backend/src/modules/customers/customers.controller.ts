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
  ParseBoolPipe,
  Req,
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
import { CustomerResponseDto } from './dto/response/customer-response.dto';
import { PaginatedCustomersResponseDto } from './dto/response/paginated-customers-response.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { RequestWithUser } from '../auth/interfaces/request-with-user.interface';
import { CustomerFilter } from './types/customers.types';
import { CUSTOMERS_CONSTANTS } from './constants/customers.constants';
import { AuthWithOwnership, CustomerResource } from '../../common';

@ApiTags('👥 Управление клиентами')
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  @AuthWithOwnership()
  @Roles('owner', 'admin', 'manager')
  @ApiOperation({ 
    summary: 'Создание нового клиента',
    description: 'Создание клиента для компании пользователя. Доступно владельцам, админам и менеджерам.'
  })
  @ApiBody({ type: CreateCustomerDto })
  @ApiResponse({ status: HttpStatus.CREATED, type: CustomerResponseDto })
  @ApiConflictResponse({ description: 'Клиент с таким email уже существует в компании' })
  @ApiBadRequestResponse({ description: 'Некорректные данные или превышен лимит клиентов' })
  @ApiUnauthorizedResponse({ description: 'Требуется авторизация' })
  @ApiForbiddenResponse({ description: 'Недостаточно прав доступа' })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async create(
    @Body() createCustomerDto: CreateCustomerDto,
    @Req() req: RequestWithUser,
  ): Promise<CustomerResponseDto> {
    return this.customersService.createForUser(createCustomerDto, req.user);
  }

  @Get()
  @AuthWithOwnership()
  @ApiOperation({ 
    summary: 'Получение списка клиентов',
    description: 'Получение списка клиентов с фильтрацией и пагинацией. Каждый видит только клиентов своей компании.'
  })
  @ApiQuery({ name: 'search', required: false, description: 'Поиск по имени, email, телефону' })
  @ApiQuery({ name: 'type', required: false, description: 'Тип клиента (individual/company)' })
  @ApiQuery({ name: 'isActive', required: false, description: 'Статус активности' })
  @ApiQuery({ name: 'source', required: false, description: 'Источник привлечения' })
  @ApiQuery({ name: 'page', required: false, description: 'Номер страницы' })
  @ApiQuery({ name: 'limit', required: false, description: 'Размер страницы' })
  @ApiResponse({ status: HttpStatus.OK, type: PaginatedCustomersResponseDto })
  @ApiUnauthorizedResponse({ description: 'Требуется авторизация' })
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async findAll(
    @Req() req: RequestWithUser,
    @Query('search') search?: string,
    @Query('type') type?: string,
    @Query('isActive') isActive?: boolean,
    @Query('source') source?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(CUSTOMERS_CONSTANTS.DEFAULTS.PAGE_SIZE), ParseIntPipe) limit: number = CUSTOMERS_CONSTANTS.DEFAULTS.PAGE_SIZE,
    @Query('sortField', new DefaultValuePipe('createdAt')) sortField: string = 'createdAt',
    @Query('sortOrder', new DefaultValuePipe('desc')) sortOrder: 'asc' | 'desc' = 'desc',
  ): Promise<PaginatedCustomersResponseDto> {
    const filter: CustomerFilter = {
      search,
      type: type as any,
      isActive,
      source,
      page,
      limit: Math.min(limit, CUSTOMERS_CONSTANTS.DEFAULTS.MAX_ITEMS),
      sortField: sortField as any,
      sortOrder,
    };

    return this.customersService.findAllForUser(req.user, filter);
  }

  @Get(':id')
  @AuthWithOwnership()
  @CustomerResource()
  @ApiOperation({ 
    summary: 'Получение клиента по ID',
    description: 'Получение детальной информации о клиенте с проверкой принадлежности к компании.'
  })
  @ApiParam({ name: 'id', description: 'ID клиента' })
  @ApiResponse({ status: HttpStatus.OK, type: CustomerResponseDto })
  @ApiNotFoundResponse({ description: 'Клиент не найден' })
  @ApiUnauthorizedResponse({ description: 'Требуется авторизация' })
  @ApiForbiddenResponse({ description: 'Нет доступа к клиенту' })
  @Throttle({ default: { limit: 50, ttl: 60000 } })
  async findOne(@Param('id') id: string): Promise<CustomerResponseDto> {
    return this.customersService.findOne(id);
  }

  @Patch(':id')
  @AuthWithOwnership()
  @CustomerResource()
  @Roles('owner', 'admin', 'manager')
  @ApiOperation({ 
    summary: 'Обновление данных клиента',
    description: 'Обновление информации о клиенте с проверкой принадлежности к компании.'
  })
  @ApiParam({ name: 'id', description: 'ID клиента' })
  @ApiBody({ type: UpdateCustomerDto })
  @ApiResponse({ status: HttpStatus.OK, type: CustomerResponseDto })
  @ApiNotFoundResponse({ description: 'Клиент не найден' })
  @ApiConflictResponse({ description: 'Email уже используется другим клиентом' })
  @ApiBadRequestResponse({ description: 'Некорректные данные' })
  @ApiUnauthorizedResponse({ description: 'Требуется авторизация' })
  @ApiForbiddenResponse({ description: 'Недостаточно прав или нет доступа к клиенту' })
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async update(
    @Param('id') id: string,
    @Body() updateCustomerDto: UpdateCustomerDto,
  ): Promise<CustomerResponseDto> {
    return this.customersService.update(id, updateCustomerDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @AuthWithOwnership()
  @CustomerResource()
  @Roles('owner', 'admin')
  @ApiOperation({ 
    summary: 'Деактивация клиента',
    description: 'Мягкое удаление клиента (деактивация). Доступно владельцам и админам.'
  })
  @ApiParam({ name: 'id', description: 'ID клиента' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  @ApiNotFoundResponse({ description: 'Клиент не найден' })
  @ApiUnauthorizedResponse({ description: 'Требуется авторизация' })
  @ApiForbiddenResponse({ description: 'Недостаточно прав доступа' })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async remove(@Param('id') id: string): Promise<void> {
    return this.customersService.remove(id);
  }

  @Delete(':id/hard')
  @HttpCode(HttpStatus.NO_CONTENT)
  @AuthWithOwnership()
  @CustomerResource()
  @Roles('superadmin')
  @ApiOperation({ 
    summary: 'Полное удаление клиента (только суперадмин)',
    description: 'ОПАСНАЯ ОПЕРАЦИЯ! Полное удаление клиента из базы данных.'
  })
  @ApiParam({ name: 'id', description: 'ID клиента' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  @ApiNotFoundResponse({ description: 'Клиент не найден' })
  @ApiUnauthorizedResponse({ description: 'Требуется авторизация' })
  @ApiForbiddenResponse({ description: 'Доступно только суперадминистратору' })
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async hardRemove(@Param('id') id: string): Promise<void> {
    return this.customersService.hardRemove(id);
  }

  @Patch(':id/status')
  @AuthWithOwnership()
  @CustomerResource()
  @Roles('owner', 'admin')
  @ApiOperation({ 
    summary: 'Изменение статуса активности клиента',
    description: 'Активация или деактивация клиента.'
  })
  @ApiParam({ name: 'id', description: 'ID клиента' })
  @ApiQuery({ name: 'isActive', type: Boolean, description: 'Новый статус' })
  @ApiResponse({ status: HttpStatus.OK, type: CustomerResponseDto })
  @Throttle({ default: { limit: 15, ttl: 60000 } })
  async setActive(
    @Param('id') id: string,
    @Query('isActive', ParseBoolPipe) isActive: boolean,
  ): Promise<CustomerResponseDto> {
    return this.customersService.setActive(id, isActive);
  }

  @Get('stats/dashboard')
  @AuthWithOwnership()
  @Roles('owner', 'admin', 'manager')
  @ApiOperation({ 
    summary: 'Статистика по клиентам',
    description: 'Получение статистики по клиентам для дашборда.'
  })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async getStats(@Req() req: RequestWithUser): Promise<any> {
    return this.customersService.getStats(req.user.companyId!);
  }
}
