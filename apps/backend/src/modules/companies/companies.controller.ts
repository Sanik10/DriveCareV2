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
  UseGuards,
  UseInterceptors,
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
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CompaniesService } from './companies.service';
import { CreateCompanyDto } from './dto/request/create-company.dto';
import { UpdateCompanyDto } from './dto/request/update-company.dto';
import { CompanyResponseDto } from './dto/response/company-response.dto';
import { PaginatedCompaniesResponseDto } from './dto/response/paginated-companies-response.dto';
import { RequestWithUser } from '../auth/interfaces/request-with-user.interface';
import { CompanyFilter } from './types/companies.types';
import { COMPANIES_CONSTANTS } from './constants/companies.constants';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AUTH_CONSTANTS } from '../auth/constants/auth.constants';

// ✅ ИСПРАВЛЕНО: Правильные импорты
import { CompanyOwnershipGuard } from '../../common/guards/company-ownership.guard';
import { CompanyResource } from '../../common/decorators/resource.decorator';
import { AuditLoggingInterceptor } from '../../common/interceptors/audit-logging.interceptor';

@ApiTags('🏢 Управление компаниями')
@ApiBearerAuth('JWT-auth')
@Controller('companies')
export class CompaniesController {
  constructor(
    private readonly companiesService: CompaniesService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard, CompanyOwnershipGuard)
  @UseInterceptors(AuditLoggingInterceptor)
  @Roles(AUTH_CONSTANTS.SYSTEM_ROLES.SUPERADMIN, AUTH_CONSTANTS.SYSTEM_ROLES.COMPANY_OWNER)
  @ApiOperation({ 
    summary: '🔒 Создание новой компании',
    description: 'Создание новой компании с enterprise security'
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: '✅ Компания успешно создана',
    type: CompanyResponseDto,
  })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async create(
    @Body() createCompanyDto: CreateCompanyDto,
    @Req() req: RequestWithUser
  ): Promise<CompanyResponseDto> {
    return this.companiesService.create(
      createCompanyDto, 
      req.user.id, 
      req.user.role,
      req.ip,
      req.headers['user-agent']
    );
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @UseInterceptors(AuditLoggingInterceptor)
  @ApiOperation({ 
    summary: '🔒 Получение списка компаний',
    description: 'Получение списка компаний с multi-tenant изоляцией'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '✅ Список компаний получен',
    type: PaginatedCompaniesResponseDto,
  })
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async findAll(
    @Req() req: RequestWithUser,
    @Query('search') search?: string,
    @Query('isActive', new DefaultValuePipe(undefined)) isActive?: boolean,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(COMPANIES_CONSTANTS.DEFAULTS.PAGE_SIZE), ParseIntPipe) 
    limit: number = COMPANIES_CONSTANTS.DEFAULTS.PAGE_SIZE,
    @Query('sortField', new DefaultValuePipe('createdAt')) sortField: string = 'createdAt',
    @Query('sortOrder', new DefaultValuePipe('desc')) sortOrder: 'asc' | 'desc' = 'desc',
  ): Promise<PaginatedCompaniesResponseDto> {
    const filter: CompanyFilter = {
      search,
      isActive,
      page: Math.max(1, Math.min(page, 1000)),
      limit: Math.min(limit, COMPANIES_CONSTANTS.DEFAULTS.MAX_ITEMS),
      sortField: sortField as any,
      sortOrder,
    };

    // ✅ ИСПРАВЛЕНО: Исправлен параметр
    return this.companiesService.findAll(filter, req.user.id, req.user.role, req.user.companyId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard, CompanyOwnershipGuard)
  @UseInterceptors(AuditLoggingInterceptor)
  @CompanyResource()
  @ApiOperation({ 
    summary: '🔒 Получение компании по ID',
    description: 'Получение детальной информации о компании'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '✅ Компания найдена',
    type: CompanyResponseDto,
  })
  @Throttle({ default: { limit: 50, ttl: 60000 } })
  async findOne(
    @Param('id') id: string,
    @Req() req: RequestWithUser
  ): Promise<CompanyResponseDto> {
    return this.companiesService.findOne(id, req.user.id, req.user.role, req.user.companyId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard, CompanyOwnershipGuard)
  @UseInterceptors(AuditLoggingInterceptor)
  @CompanyResource()
  @Roles(AUTH_CONSTANTS.SYSTEM_ROLES.SUPERADMIN, AUTH_CONSTANTS.SYSTEM_ROLES.COMPANY_OWNER)
  @ApiOperation({ 
    summary: '🔒 Обновление компании',
    description: 'Обновление информации о компании'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '✅ Компания обновлена',
    type: CompanyResponseDto,
  })
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async update(
    @Param('id') id: string,
    @Body() updateCompanyDto: UpdateCompanyDto,
    @Req() req: RequestWithUser
  ): Promise<CompanyResponseDto> {
    return this.companiesService.update(
      id, 
      updateCompanyDto, 
      req.user.id, 
      req.user.role,
      req.user.companyId, // ✅ ИСПРАВЛЕНО: Добавлен обязательный параметр
      req.ip,
      req.headers['user-agent']
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard, RolesGuard, CompanyOwnershipGuard)
  @UseInterceptors(AuditLoggingInterceptor)
  @CompanyResource()
  @Roles(AUTH_CONSTANTS.SYSTEM_ROLES.SUPERADMIN)
  @ApiOperation({ 
    summary: '🚨 Удаление компании',
    description: 'КРИТИЧЕСКАЯ ОПЕРАЦИЯ: Полное удаление компании'
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: '✅ Компания удалена',
  })
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async remove(
    @Param('id') id: string,
    @Req() req: RequestWithUser
  ): Promise<void> {
    return this.companiesService.remove(
      id, 
      req.user.id, 
      req.user.role,
      req.ip,
      req.headers['user-agent']
    );
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard, CompanyOwnershipGuard)
  @UseInterceptors(AuditLoggingInterceptor)
  @CompanyResource()
  @Roles(AUTH_CONSTANTS.SYSTEM_ROLES.SUPERADMIN, AUTH_CONSTANTS.SYSTEM_ROLES.COMPANY_OWNER)
  @ApiOperation({ 
    summary: '🔒 Изменение статуса компании',
    description: 'Активация или деактивация компании'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '✅ Статус изменен',
    type: CompanyResponseDto,
  })
  @Throttle({ default: { limit: 15, ttl: 60000 } })
  async setActive(
    @Param('id') id: string,
    @Query('isActive', ParseBoolPipe) isActive: boolean,
    @Req() req: RequestWithUser
  ): Promise<CompanyResponseDto> {
    return this.companiesService.setActive(
      id, 
      isActive, 
      req.user.id, 
      req.user.role,
      req.user.companyId, // ✅ ИСПРАВЛЕНО: Добавлен обязательный параметр
      req.ip,
      req.headers['user-agent']
    );
  }
}
