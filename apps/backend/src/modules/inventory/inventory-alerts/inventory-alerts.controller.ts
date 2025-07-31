// src/modules/inventory/inventory-alerts/inventory-alerts.controller.ts
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
import { InventoryAlertsService } from './inventory-alerts.service';
import { UpdateAlertSettingsDto } from './dto/request/alert-settings.dto';
import { TestNotificationDto } from './dto/request/test-notification.dto';
import { AlertResponseDto } from './dto/response/alert-response.dto';
import { PaginatedAlertsResponseDto } from './dto/response/paginated-alerts-response.dto';
import { AlertSettingsResponseDto } from './dto/response/alert-settings-response.dto';
import { TestNotificationResponseDto } from './dto/response/test-notification-response.dto';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RequestWithUser } from '../../auth/interfaces/request-with-user.interface';
import { AuthWithOwnership, CompanyResource } from '../../../common';
import { AlertFilter } from './types/alerts.types';
import { AlertType, AlertPriority } from '../constants/inventory.constants';

@ApiTags('🚨 Уведомления склада')
@Controller('inventory/alerts')
export class InventoryAlertsController {
  constructor(private readonly inventoryAlertsService: InventoryAlertsService) {}

  /**
   * 🔒 Получение списка уведомлений
   */
  @Get()
  @AuthWithOwnership()
  @ApiOperation({ 
    summary: 'Получение списка уведомлений склада',
    description: 'Получение списка уведомлений о состоянии склада с фильтрацией и пагинацией.'
  })
  @ApiQuery({ name: 'type', required: false, enum: ['low_stock', 'out_of_stock', 'overstock', 'expired_reservation'] })
  @ApiQuery({ name: 'priority', required: false, enum: ['low', 'medium', 'high', 'critical'] })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'isDismissed', required: false, type: Boolean })
  @ApiQuery({ name: 'partId', required: false, description: 'ID запчасти' })
  @ApiQuery({ name: 'categoryId', required: false, description: 'ID категории' })
  @ApiQuery({ name: 'search', required: false, description: 'Поиск по названию запчасти' })
  @ApiQuery({ name: 'page', required: false, description: 'Номер страницы' })
  @ApiQuery({ name: 'limit', required: false, description: 'Размер страницы' })
  @ApiResponse({ status: HttpStatus.OK, type: PaginatedAlertsResponseDto })
  @ApiUnauthorizedResponse({ description: '❌ Требуется авторизация' })
  @Throttle({ default: { limit: 50, ttl: 60000 } })
  async findAll(
    @Req() req: RequestWithUser,
    @Query('type') type?: AlertType,
    @Query('priority') priority?: AlertPriority,
    @Query('isActive') isActive?: boolean,
    @Query('isDismissed') isDismissed?: boolean,
    @Query('partId') partId?: string,
    @Query('categoryId') categoryId?: string,
    @Query('search') search?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(25), ParseIntPipe) limit: number = 25,
  ): Promise<PaginatedAlertsResponseDto> {
    const filter: AlertFilter = {
      companyId: req.user.role === 'superadmin' ? undefined : req.user.companyId,
      type,
      priority,
      isActive,
      isDismissed,
      partId,
      categoryId,
      search,
      page,
      limit: Math.min(limit, 100),
    };

    return this.inventoryAlertsService.findAll(filter);
  }

  /**
   * 🔒 Получение уведомления по ID
   */
  @Get(':id')
  @AuthWithOwnership()
  @CompanyResource()
  @ApiOperation({ 
    summary: 'Получение уведомления по ID',
    description: 'Получение детальной информации об уведомлении.'
  })
  @ApiParam({ name: 'id', description: 'ID уведомления' })
  @ApiResponse({ status: HttpStatus.OK, type: AlertResponseDto })
  @ApiNotFoundResponse({ description: '❌ Уведомление не найдено' })
  @Throttle({ default: { limit: 100, ttl: 60000 } })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<AlertResponseDto> {
    return this.inventoryAlertsService.findOne(id);
  }

  /**
   * 🚫 Отклонение уведомления
   */
  @Delete(':id/dismiss')
  @HttpCode(HttpStatus.OK)
  @AuthWithOwnership()
  @CompanyResource()
  @Roles('owner', 'admin', 'manager')
  @ApiOperation({ 
    summary: 'Отклонение уведомления',
    description: 'Отклонение (закрытие) уведомления о состоянии склада.'
  })
  @ApiParam({ name: 'id', description: 'ID уведомления' })
  @ApiResponse({ status: HttpStatus.OK, type: AlertResponseDto })
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async dismissAlert(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: RequestWithUser,
  ): Promise<AlertResponseDto> {
    return this.inventoryAlertsService.dismissAlert(id, req.user);
  }

  /**
   * 📊 Статистика уведомлений
   */
  @Get('analytics/stats')
  @AuthWithOwnership()
  @ApiOperation({ 
    summary: 'Статистика уведомлений',
    description: 'Получение детальной статистики по уведомлениям за период.'
  })
  @ApiQuery({ name: 'dateFrom', required: false, description: 'Дата начала периода' })
  @ApiQuery({ name: 'dateTo', required: false, description: 'Дата окончания периода' })
  @ApiResponse({ status: HttpStatus.OK })
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async getStats(
    @Req() req: RequestWithUser,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ): Promise<any> {
    const fromDate = dateFrom ? new Date(dateFrom) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const toDate = dateTo ? new Date(dateTo) : new Date();

    return this.inventoryAlertsService.getAlertStats(req.user.companyId, fromDate, toDate);
  }

  /**
   * 🚨 Критические уведомления
   */
  @Get('critical/list')
  @AuthWithOwnership()
  @ApiOperation({ 
    summary: 'Критические уведомления',
    description: 'Получение списка критических уведомлений, требующих немедленного внимания.'
  })
  @ApiResponse({ status: HttpStatus.OK, type: [AlertResponseDto] })
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async getCriticalAlerts(@Req() req: RequestWithUser): Promise<AlertResponseDto[]> {
    return this.inventoryAlertsService.getCriticalAlerts(req.user.companyId);
  }

  /**
   * ⚙️ Получение настроек уведомлений
   */
  @Get('settings/current')
  @AuthWithOwnership()
  @ApiOperation({ 
    summary: 'Получение настроек уведомлений',
    description: 'Получение текущих настроек системы уведомлений для компании.'
  })
  @ApiResponse({ status: HttpStatus.OK, type: AlertSettingsResponseDto })
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async getSettings(@Req() req: RequestWithUser): Promise<AlertSettingsResponseDto> {
    return this.inventoryAlertsService.getAlertSettings(req.user.companyId);
  }

  /**
   * ⚙️ Обновление настроек уведомлений
   */
  @Patch('settings/update')
  @AuthWithOwnership()
  @Roles('owner', 'admin')
  @ApiOperation({ 
    summary: 'Обновление настроек уведомлений',
    description: 'Изменение настроек системы уведомлений о состоянии склада.'
  })
  @ApiBody({ type: UpdateAlertSettingsDto })
  @ApiResponse({ status: HttpStatus.OK, type: AlertSettingsResponseDto })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async updateSettings(
    @Body() updateSettingsDto: UpdateAlertSettingsDto,
    @Req() req: RequestWithUser,
  ): Promise<AlertSettingsResponseDto> {
    return this.inventoryAlertsService.updateAlertSettings(req.user.companyId, updateSettingsDto);
  }

  /**
   * 📧 Тестовое уведомление
   */
  @Post('test/notification')
  @AuthWithOwnership()
  @Roles('owner', 'admin')
  @ApiOperation({ 
    summary: 'Отправка тестового уведомления',
    description: 'Отправка тестового уведомления для проверки настроек email/push уведомлений.'
  })
  @ApiBody({ type: TestNotificationDto })
  @ApiResponse({ status: HttpStatus.OK, type: TestNotificationResponseDto })
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async sendTestNotification(
    @Body() testNotificationDto: TestNotificationDto,
    @Req() req: RequestWithUser,
  ): Promise<TestNotificationResponseDto> {
    return this.inventoryAlertsService.sendTestNotification(
      req.user.companyId,
      testNotificationDto,
      req.user
    );
  }

  /**
   * 🧹 Очистка истекших уведомлений
   */
  @Delete('cleanup/expired')
  @HttpCode(HttpStatus.OK)
  @AuthWithOwnership()
  @Roles('owner', 'admin')
  @ApiOperation({ 
    summary: 'Очистка истекших уведомлений',
    description: 'Автоматическое отклонение уведомлений, которые не были обработаны в течение заданного времени.'
  })
  @ApiResponse({ 
    status: HttpStatus.OK,
    schema: {
      properties: {
        cleanedCount: { type: 'number' },
        message: { type: 'string' },
      }
    }
  })
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  async cleanupExpiredAlerts(
    @Req() req: RequestWithUser,
  ): Promise<{ cleanedCount: number; message: string }> {
    const cleanedCount = await this.inventoryAlertsService.cleanupExpiredAlerts(req.user.companyId);
    
    return {
      cleanedCount,
      message: `Очищено ${cleanedCount} истекших уведомлений`,
    };
  }

  /**
   * 📊 Групповые операции с уведомлениями
   */
  @Post('batch/dismiss')
  @AuthWithOwnership()
  @Roles('owner', 'admin', 'manager')
  @ApiOperation({ 
    summary: 'Массовое отклонение уведомлений',
    description: 'Отклонение нескольких уведомлений одновременно.'
  })
  @ApiBody({
    schema: {
      properties: {
        alertIds: { type: 'array', items: { type: 'string' } },
      }
    }
  })
  @ApiResponse({ 
    status: HttpStatus.OK,
    schema: {
      properties: {
        dismissedCount: { type: 'number' },
        failedCount: { type: 'number' },
        errors: { type: 'array', items: { type: 'string' } },
      }
    }
  })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async batchDismissAlerts(
    @Body() body: { alertIds: string[] },
    @Req() req: RequestWithUser,
  ): Promise<{ dismissedCount: number; failedCount: number; errors: string[] }> {
    return this.inventoryAlertsService.batchDismissAlerts(body.alertIds, req.user);
  }
}
