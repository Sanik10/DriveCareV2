// path: apps/backend/src/modules/inventory/inventory-alerts/inventory-alerts.controller.ts
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
  ParseBoolPipe,
  Req,
  BadRequestException,
  Headers,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiUnauthorizedResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { InventoryAlertsService } from './inventory-alerts.service';
import { UpdateAlertSettingsDto } from './dto/request/alert-settings.dto';
import { TestNotificationDto } from './dto/request/test-notification.dto';
import { AlertResponseDto } from './dto/response/alert-response.dto';
import { PaginatedAlertsResponseDto } from './dto/response/paginated-alerts-response.dto';
import { AlertSettingsResponseDto } from './dto/response/alert-settings-response.dto';
import { TestNotificationResponseDto } from './dto/response/test-notification-response.dto';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RequestWithUser } from '../../auth/interfaces/request-with-user.interface';
import { AuthWithOwnership } from '../../../common/guards/auth-with-ownership.guard';
import { InventoryAlertResource } from '../../../common/decorators/resource.decorator';
import { AlertFilter } from './types/alerts.types';
import { AlertType, AlertPriority } from '../constants/inventory.constants';

@ApiTags('🚨 Уведомления склада')
@Controller('inventory/alerts')
export class InventoryAlertsController {
  constructor(private readonly inventoryAlertsService: InventoryAlertsService) {}

  /**
   * 📊 Статистика уведомлений (СТАТИЧЕСКИЙ маршрут)
   */
  @Get('analytics/stats')
  @AuthWithOwnership()
  @Roles('superadmin', 'company_owner', 'company_admin', 'inventory_manager')
  @ApiOperation({
    summary: 'Статистика уведомлений',
    description: 'Получение детальной статистики по уведомлениям за период.',
  })
  @ApiQuery({ name: 'companyId', required: false, description: 'ID компании (обязателен для superadmin)' })
  @ApiQuery({ name: 'dateFrom', required: false, description: 'Дата начала периода (ISO)' })
  @ApiQuery({ name: 'dateTo', required: false, description: 'Дата окончания периода (ISO)' })
  @ApiResponse({ status: HttpStatus.OK })
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async getStats(
    @Req() req: RequestWithUser,
    @Query('companyId') companyId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ): Promise<any> {
    const user = req.user;
    const effectiveCompanyId = user.role === 'superadmin' ? companyId : user.companyId;
    if (user.role === 'superadmin' && !effectiveCompanyId) {
      throw new BadRequestException('companyId is required for superadmin');
    }

    const fromDate = dateFrom ? new Date(dateFrom) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const toDate = dateTo ? new Date(dateTo) : new Date();
    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      throw new BadRequestException('Invalid dateFrom or dateTo');
    }

    return this.inventoryAlertsService.getAlertStats(effectiveCompanyId!, fromDate, toDate);
  }

  /**
   * 🚨 Критические уведомления (СТАТИЧЕСКИЙ маршрут)
   */
  @Get('critical/list')
  @AuthWithOwnership()
  @Roles('superadmin', 'company_owner', 'company_admin', 'inventory_manager')
  @ApiOperation({
    summary: 'Критические уведомления',
    description: 'Получение списка критических уведомлений, требующих немедленного внимания.',
  })
  @ApiQuery({ name: 'companyId', required: false, description: 'ID компании (обязателен для superadmin)' })
  @ApiResponse({ status: HttpStatus.OK, type: [AlertResponseDto] })
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async getCriticalAlerts(@Req() req: RequestWithUser, @Query('companyId') companyId?: string): Promise<AlertResponseDto[]> {
    const user = req.user;
    const effectiveCompanyId = user.role === 'superadmin' ? companyId : user.companyId;
    if (user.role === 'superadmin' && !effectiveCompanyId) {
      throw new BadRequestException('companyId is required for superadmin');
    }
    return this.inventoryAlertsService.getCriticalAlerts(effectiveCompanyId!, user);
  }

  /**
   * ⚙️ Получение настроек уведомлений (СТАТИЧЕСКИЙ маршрут)
   */
  @Get('settings/current')
  @AuthWithOwnership()
  @Roles('superadmin', 'company_owner', 'company_admin', 'inventory_manager')
  @ApiOperation({
    summary: 'Получение настроек уведомлений',
    description: 'Получение текущих настроек системы уведомлений для компании.',
  })
  @ApiResponse({ status: HttpStatus.OK, type: AlertSettingsResponseDto })
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async getSettings(@Req() req: RequestWithUser): Promise<AlertSettingsResponseDto> {
    return this.inventoryAlertsService.getAlertSettings(req.user.companyId);
  }

  /**
   * ⚙️ Обновление настроек уведомлений (СТАТИЧЕСКИЙ маршрут)
   */
  @Patch('settings/update')
  @AuthWithOwnership()
  @Roles('company_owner', 'company_admin')
  @ApiOperation({
    summary: 'Обновление настроек уведомлений',
    description: 'Изменение настроек системы уведомлений о состоянии склада.',
  })
  @ApiBody({ type: UpdateAlertSettingsDto })
  @ApiResponse({ status: HttpStatus.OK, type: AlertSettingsResponseDto })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async updateSettings(@Body() updateSettingsDto: UpdateAlertSettingsDto, @Req() req: RequestWithUser): Promise<AlertSettingsResponseDto> {
    return this.inventoryAlertsService.updateAlertSettings(req.user.companyId, updateSettingsDto, req.user);
  }

  /**
   * 📧 Тестовое уведомление (СТАТИЧЕСКИЙ маршрут)
   */
  @Post('test/notification')
  @AuthWithOwnership()
  @Roles('company_owner', 'company_admin')
  @ApiOperation({
    summary: 'Отправка тестового уведомления',
    description: 'Отправка тестового уведомления для проверки настроек email/push уведомлений.',
  })
  @ApiBody({ type: TestNotificationDto })
  @ApiResponse({ status: HttpStatus.OK, type: TestNotificationResponseDto })
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async sendTestNotification(
    @Body() testNotificationDto: TestNotificationDto,
    @Req() req: RequestWithUser,
    @Headers('x-idempotency-key') idempotencyKey: string,
  ): Promise<TestNotificationResponseDto> {
    return this.inventoryAlertsService.sendTestNotification(req.user.companyId, testNotificationDto, req.user, idempotencyKey);
  }

  /**
   * 🧹 Очистка истекших уведомлений (СТАТИЧЕСКИЙ маршрут)
   */
  @Delete('cleanup/expired')
  @HttpCode(HttpStatus.OK)
  @AuthWithOwnership()
  @Roles('company_owner', 'company_admin')
  @ApiOperation({
    summary: 'Очистка истекших уведомлений',
    description: 'Автоматическое отклонение уведомлений, которые не были обработаны в течение заданного времени.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    schema: {
      properties: {
        cleanedCount: { type: 'number' },
        message: { type: 'string' },
      },
    },
  })
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  async cleanupExpiredAlerts(@Req() req: RequestWithUser): Promise<{ cleanedCount: number; message: string }> {
    const cleanedCount = await this.inventoryAlertsService.cleanupExpiredAlerts(req.user.companyId);
    return { cleanedCount, message: `Очищено ${cleanedCount} истекших уведомлений` };
  }

  /**
   * 📊 Групповое отклонение уведомлений (СТАТИЧЕСКИЙ маршрут)
   */
  @Post('batch/dismiss')
  @AuthWithOwnership()
  @Roles('company_owner', 'company_admin', 'inventory_manager')
  @ApiOperation({
    summary: 'Массовое отклонение уведомлений',
    description: 'Отклонение нескольких уведомлений одновременно.',
  })
  @ApiBody({
    schema: {
      properties: {
        alertIds: { type: 'array', items: { type: 'string', format: 'uuid' } },
      },
      required: ['alertIds'],
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    schema: {
      properties: {
        dismissedCount: { type: 'number' },
        failedCount: { type: 'number' },
        errors: { type: 'array', items: { type: 'string' } },
      },
    },
  })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async batchDismissAlerts(
    @Body() body: { alertIds: string[] },
    @Req() req: RequestWithUser,
    @Headers('x-idempotency-key') idempotencyKey: string,
  ): Promise<{ dismissedCount: number; failedCount: number; errors: string[] }> {
    if (!Array.isArray(body.alertIds) || body.alertIds.length === 0) {
      throw new BadRequestException('alertIds must be a non-empty array of UUIDs');
    }
    return this.inventoryAlertsService.batchDismissAlerts(body.alertIds, req.user, idempotencyKey);
  }

  /**
   * 🔒 Получение списка уведомлений (ЛИСТИНГ)
   */
  @Get()
  @AuthWithOwnership()
  @Roles('superadmin', 'company_owner', 'company_admin', 'inventory_manager')
  @ApiOperation({
    summary: 'Получение списка уведомлений склада',
    description: 'Получение списка уведомлений о состоянии склада с фильтрацией и пагинацией.',
  })
  @ApiQuery({ name: 'companyId', required: false, description: 'ID компании (обязателен для superadmin)' })
  @ApiQuery({ name: 'type', required: false, enum: ['low_stock', 'out_of_stock', 'overstock', 'expired_reservation'] })
  @ApiQuery({ name: 'priority', required: false, enum: ['low', 'medium', 'high', 'critical'] })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'isDismissed', required: false, type: Boolean })
  @ApiQuery({ name: 'partId', required: false, description: 'ID запчасти' })
  @ApiQuery({ name: 'categoryId', required: false, description: 'ID категории' })
  @ApiQuery({ name: 'search', required: false, description: 'Поиск по названию запчасти/номеру/заголовку' })
  @ApiQuery({
    name: 'sortField',
    required: false,
    description: 'Поле сортировки',
    enum: ['createdAt', 'priority', 'type', 'partName', 'currentQuantity', 'shortage'],
  })
  @ApiQuery({ name: 'sortOrder', required: false, description: 'Порядок сортировки', enum: ['asc', 'desc'] })
  @ApiQuery({ name: 'page', required: false, description: 'Номер страницы' })
  @ApiQuery({ name: 'limit', required: false, description: 'Размер страницы' })
  @ApiResponse({ status: HttpStatus.OK, type: PaginatedAlertsResponseDto })
  @ApiUnauthorizedResponse({ description: '❌ Требуется авторизация' })
  @Throttle({ default: { limit: 50, ttl: 60000 } })
  async findAll(
    @Req() req: RequestWithUser,
    @Query('companyId') companyId?: string,
    @Query('type') type?: AlertType,
    @Query('priority') priority?: AlertPriority,
    @Query('isActive', new DefaultValuePipe(undefined), ParseBoolPipe) isActive?: boolean,
    @Query('isDismissed', new DefaultValuePipe(undefined), ParseBoolPipe) isDismissed?: boolean,
    @Query('partId') partId?: string,
    @Query('categoryId') categoryId?: string,
    @Query('search') search?: string,
    @Query('sortField') sortField?: 'createdAt' | 'priority' | 'type' | 'partName' | 'currentQuantity' | 'shortage',
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(25), ParseIntPipe) limit: number = 25,
  ): Promise<PaginatedAlertsResponseDto> {
    const user = req.user;
    const typedMax = Number(process.env.INVENTORY_MAX_PAGE_SIZE) || 100;
    const allowedLimit = Math.min(limit, typedMax);

    const effectiveCompanyId = user.role === 'superadmin' ? companyId : user.companyId;
    if (user.role === 'superadmin' && !effectiveCompanyId) {
      throw new BadRequestException('companyId is required for superadmin');
    }

    const allowedSortFields = new Set(['createdAt', 'priority', 'type', 'partName', 'currentQuantity', 'shortage']);
    const normalizedSortField = allowedSortFields.has(String(sortField)) ? (sortField as any) : 'createdAt';
    const normalizedSortOrder = String(sortOrder).toLowerCase() === 'asc' ? 'asc' : 'desc';

    const filter: AlertFilter = {
      companyId: effectiveCompanyId!,
      type,
      priority,
      isActive,
      isDismissed,
      partId,
      categoryId,
      search: search?.trim().slice(0, 100),
      page,
      limit: allowedLimit,
      sortField: normalizedSortField,
      sortOrder: normalizedSortOrder,
    };

    return this.inventoryAlertsService.findAll(filter, user);
  }

  /**
   * 🔒 Получение уведомления по ID (ДИНАМИЧЕСКИЙ маршрут)
   */
  @Get(':id')
  @AuthWithOwnership()
  @InventoryAlertResource()
  @Roles('superadmin', 'company_owner', 'company_admin', 'inventory_manager')
  @ApiOperation({
    summary: 'Получение уведомления по ID',
    description: 'Получение детальной информации об уведомлении.',
  })
  @ApiParam({ name: 'id', description: 'ID уведомления' })
  @ApiResponse({ status: HttpStatus.OK, type: AlertResponseDto })
  @ApiNotFoundResponse({ description: '❌ Уведомление не найдено' })
  @Throttle({ default: { limit: 100, ttl: 60000 } })
  async findOne(@Param('id', ParseUUIDPipe) id: string, @Req() req: RequestWithUser): Promise<AlertResponseDto> {
    return this.inventoryAlertsService.findOne(id, req.user);
  }

  /**
   * 🚫 Отклонение уведомления (ДИНАМИЧЕСКИЙ маршрут)
   */
  @Delete(':id/dismiss')
  @HttpCode(HttpStatus.OK)
  @AuthWithOwnership()
  @InventoryAlertResource()
  @Roles('company_owner', 'company_admin', 'inventory_manager')
  @ApiOperation({
    summary: 'Отклонение уведомления',
    description: 'Отклонение (закрытие) уведомления о состоянии склада.',
  })
  @ApiParam({ name: 'id', description: 'ID уведомления' })
  @ApiResponse({ status: HttpStatus.OK, type: AlertResponseDto })
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async dismissAlert(@Param('id', ParseUUIDPipe) id: string, @Req() req: RequestWithUser): Promise<AlertResponseDto> {
    return this.inventoryAlertsService.dismissAlert(id, req.user);
  }
}
