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
  ParseBoolPipe,
  DefaultValuePipe,
  ParseIntPipe,
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
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CompaniesService } from './companies.service';
import { CreateCompanyDto } from './dto/request/create-company.dto';
import { UpdateCompanyDto } from './dto/request/update-company.dto';
import { CompanyResponseDto } from './dto/response/company-response.dto';
import { PaginatedCompaniesResponseDto } from './dto/response/paginated-companies-response.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { RequestWithUser } from '../auth/interfaces/request-with-user.interface';
import { CompanyFilter } from './types/companies.types';
import { COMPANIES_CONSTANTS } from './constants/companies.constants';
import { AuthWithOwnership, CompanyResource } from '../../common';

@ApiTags('🏢 Управление компаниями')
@Controller('companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Post()
  @AuthWithOwnership() // 🔥 ИСПРАВЛЕНО - используем композитный guard
  @Roles('superadmin', 'owner')
  @ApiOperation({ 
    summary: 'Создание новой компании',
    description: 'Создание новой компании автосервиса. Доступно только суперадминистратору и владельцам компаний.'
  })
  @ApiBody({
    type: CreateCompanyDto,
    description: 'Данные для создания компании',
    examples: {
      autoservice: {
        summary: 'Создание автосервиса',
        description: 'Полный пример создания новой компании автосервиса',
        value: {
          name: 'АвтоСервис "Профи"',
          legalName: 'ООО "АвтоСервис Профи"',
          taxNumber: '7712345678',
          address: 'г. Москва, ул. Автомобильная, д. 15',
          phone: '+7 (495) 123-45-67',
          email: 'info@autoservice-profi.ru',
          website: 'https://autoservice-profi.ru',
          logoUrl: 'https://autoservice-profi.ru/logo.png',
          workingHours: {
            monday: { open: '08:00', close: '20:00', isOpen: true },
            tuesday: { open: '08:00', close: '20:00', isOpen: true },
            wednesday: { open: '08:00', close: '20:00', isOpen: true },
            thursday: { open: '08:00', close: '20:00', isOpen: true },
            friday: { open: '08:00', close: '20:00', isOpen: true },
            saturday: { open: '09:00', close: '18:00', isOpen: true },
            sunday: { open: '00:00', close: '00:00', isOpen: false }
          },
          isActive: true
        }
      },
      minimal: {
        summary: 'Минимальные данные',
        description: 'Создание компании с минимально необходимыми данными',
        value: {
          name: 'Быстрый Сервис',
          legalName: 'ИП Иванов И.И.',
          email: 'info@fast-service.ru'
        }
      }
    }
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: '✅ Компания успешно создана',
    type: CompanyResponseDto,
  })
  @ApiConflictResponse({
    description: '❌ Компания с таким email уже существует',
    example: { 
      statusCode: 409, 
      message: 'Компания с email info@example.com уже существует',
      error: 'Conflict'
    }
  })
  @ApiBadRequestResponse({
    description: '❌ Некорректные данные валидации',
    example: {
      statusCode: 400,
      message: ['Название компании обязательно', 'Некорректный формат email'],
      error: 'Bad Request'
    }
  })
  @ApiUnauthorizedResponse({ description: '❌ Требуется авторизация' })
  @ApiForbiddenResponse({ description: '❌ Недостаточно прав доступа' })
  @ApiTooManyRequestsResponse({ description: '⚠️ Слишком много запросов (лимит: 10 в минуту)' })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async create(@Body() createCompanyDto: CreateCompanyDto): Promise<CompanyResponseDto> {
    return this.companiesService.create(createCompanyDto);
  }

  @Get()
  @AuthWithOwnership()
  @ApiOperation({ 
    summary: 'Получение списка компаний с фильтрацией',
    description: 'Получение списка компаний с возможностью фильтрации, поиска и пагинации. Суперадмин видит все компании, владельцы - только свои.'
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Поиск по названию, юридическому названию или email',
    example: 'автосервис'
  })
  @ApiQuery({
    name: 'isActive',
    required: false,
    type: Boolean,
    description: 'Фильтр по статусу активности',
    example: true
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Номер страницы',
    example: 1
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Количество элементов на странице',
    example: 20
  })
  @ApiQuery({
    name: 'sortField',
    required: false,
    enum: ['name', 'createdAt', 'email', 'legalName'],
    description: 'Поле для сортировки',
    example: 'createdAt'
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    enum: ['asc', 'desc'],
    description: 'Порядок сортировки',
    example: 'desc'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '✅ Список компаний успешно получен',
    type: PaginatedCompaniesResponseDto,
  })
  @ApiUnauthorizedResponse({ description: '❌ Требуется авторизация' })
  @ApiTooManyRequestsResponse({ description: '⚠️ Слишком много запросов (лимит: 30 в минуту)' })
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async findAll(
	@Req() req: RequestWithUser, // 🔥 Перемещено в конец - обязательный параметр
    @Query('search') search?: string,
    @Query('isActive', new DefaultValuePipe(undefined)) isActive?: boolean,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(COMPANIES_CONSTANTS.DEFAULTS.PAGE_SIZE), ParseIntPipe) limit: number = COMPANIES_CONSTANTS.DEFAULTS.PAGE_SIZE,
    @Query('sortField', new DefaultValuePipe('createdAt')) sortField: string = 'createdAt',
    @Query('sortOrder', new DefaultValuePipe('desc')) sortOrder: 'asc' | 'desc' = 'desc',
  ): Promise<PaginatedCompaniesResponseDto> {
    const filter: CompanyFilter = {
      search,
      isActive,
      page,
      limit: Math.min(limit, COMPANIES_CONSTANTS.DEFAULTS.MAX_ITEMS),
      sortField: sortField as any,
      sortOrder,
    };

    // 🔥 КРИТИЧНОЕ ИСПРАВЛЕНИЕ - фильтрация по компании для non-superadmin
    if (req.user.role !== 'superadmin') {
      filter.companyId = req.user.companyId;
    }

    return this.companiesService.findAll(filter);
  }

  @Get(':id')
  @AuthWithOwnership() // 🔥 ДОБАВЛЕНО для консистентности
  @CompanyResource() // 🔥 ДОБАВЛЕНО - проверка принадлежности компании
  @ApiOperation({ 
    summary: 'Получение компании по ID',
    description: 'Получение детальной информации о компании по её идентификатору.'
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Уникальный идентификатор компании',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '✅ Компания успешно найдена',
    type: CompanyResponseDto,
  })
  @ApiNotFoundResponse({
    description: '❌ Компания не найдена',
    example: {
      statusCode: 404,
      message: 'Компания с ID 123e4567-e89b-12d3-a456-426614174000 не найдена',
      error: 'Not Found'
    }
  })
  @ApiUnauthorizedResponse({ description: '❌ Требуется авторизация' })
  @ApiTooManyRequestsResponse({ description: '⚠️ Слишком много запросов (лимит: 50 в минуту)' })
  @Throttle({ default: { limit: 50, ttl: 60000 } })
  async findOne(@Param('id') id: string): Promise<CompanyResponseDto> {
    return this.companiesService.findOne(id);
  }

  @Patch(':id')
  @AuthWithOwnership()
  @CompanyResource()
  @Roles('superadmin', 'owner')
  @ApiOperation({ 
    summary: 'Обновление данных компании',
    description: 'Обновление информации о компании. Владельцы могут редактировать только свою компанию.'
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Уникальный идентификатор компании',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiBody({
    type: UpdateCompanyDto,
    description: 'Данные для обновления компании',
    examples: {
      updateBasic: {
        summary: 'Обновление базовой информации',
        description: 'Изменение названия и контактов',
        value: {
          name: 'АвтоСервис "Профи Плюс"',
          phone: '+7 (495) 123-45-68',
          website: 'https://autoservice-profi-plus.ru'
        }
      },
      updateSchedule: {
        summary: 'Обновление рабочих часов',
        description: 'Изменение графика работы',
        value: {
          workingHours: {
            monday: { open: '07:00', close: '21:00', isOpen: true },
            saturday: { open: '08:00', close: '16:00', isOpen: true },
            sunday: { open: '10:00', close: '15:00', isOpen: true }
          }
        }
      }
    }
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '✅ Компания успешно обновлена',
    type: CompanyResponseDto,
  })
  @ApiNotFoundResponse({ description: '❌ Компания не найдена' })
  @ApiConflictResponse({ description: '❌ Email уже используется другой компанией' })
  @ApiBadRequestResponse({ description: '❌ Некорректные данные валидации' })
  @ApiUnauthorizedResponse({ description: '❌ Требуется авторизация' })
  @ApiForbiddenResponse({ description: '❌ Недостаточно прав доступа' })
  @ApiTooManyRequestsResponse({ description: '⚠️ Слишком много запросов (лимит: 20 в минуту)' })
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async update(
    @Param('id') id: string,
    @Body() updateCompanyDto: UpdateCompanyDto,
  ): Promise<CompanyResponseDto> {
    return this.companiesService.update(id, updateCompanyDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @AuthWithOwnership()
  @CompanyResource()
  @Roles('superadmin')
  @ApiOperation({ 
    summary: '🚨 Удаление компании (только суперадмин)',
    description: 'ОПАСНАЯ ОПЕРАЦИЯ! Полное удаление компании и всех связанных данных. Доступно только суперадминистратору.'
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Уникальный идентификатор компании',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: '✅ Компания успешно удалена',
  })
  @ApiNotFoundResponse({ description: '❌ Компания не найдена' })
  @ApiUnauthorizedResponse({ description: '❌ Требуется авторизация' })
  @ApiForbiddenResponse({ description: '❌ Доступно только суперадминистратору' })
  @ApiTooManyRequestsResponse({ description: '⚠️ Слишком много запросов (лимит: 5 в минуту)' })
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async remove(@Param('id') id: string): Promise<void> {
    return this.companiesService.remove(id);
  }

  @Patch(':id/status')
  @AuthWithOwnership() // 🔥 ИСПРАВЛЕНО - используем композитный guard
  @CompanyResource() // 🔥 ДОБАВЛЕНО - проверка принадлежности компании
  @Roles('superadmin', 'owner')
  @ApiOperation({ 
    summary: 'Изменение статуса активности компании',
    description: 'Активация или деактивация компании. Влияет на доступность всех функций компании.'
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Уникальный идентификатор компании',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiQuery({
    name: 'isActive',
    required: true,
    type: Boolean,
    description: 'Новый статус активности компании',
    example: true
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '✅ Статус компании успешно изменен',
    type: CompanyResponseDto,
  })
  @ApiNotFoundResponse({ description: '❌ Компания не найдена' })
  @ApiUnauthorizedResponse({ description: '❌ Требуется авторизация' })
  @ApiForbiddenResponse({ description: '❌ Недостаточно прав доступа' })
  @ApiTooManyRequestsResponse({ description: '⚠️ Слишком много запросов (лимит: 15 в минуту)' })
  @Throttle({ default: { limit: 15, ttl: 60000 } })
  async setActive(
    @Param('id') id: string,
    @Query('isActive', ParseBoolPipe) isActive: boolean,
  ): Promise<CompanyResponseDto> {
    return this.companiesService.setActive(id, isActive);
  }
}
