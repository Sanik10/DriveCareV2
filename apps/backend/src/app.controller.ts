// path: apps/backend/src/app.controller.ts
import { Controller, Get, Optional } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import { AppService } from './app.service';
import { SeedsService } from './database/seeds';
import { AuthWithOwnership } from './common/guards/auth-with-ownership.guard';
import { Roles } from './modules/auth/decorators/roles.decorator';
import { AuditService, AuditAction } from './common/audit/audit.service';

@ApiTags('🏠 Система')
@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    @Optional() private readonly seedsService: SeedsService,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * 🏠 Базовая информация о приложении
   */
  @Get()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  getHello(): string {
    return this.appService.getHello();
  }

  /**
   * 🏥 Health check endpoint для мониторинга
   * Предоставляет базовую информацию о состоянии системы
   */
  @ApiOperation({ summary: 'Проверка здоровья системы' })
  @ApiResponse({
    status: 200,
    description: '✅ Система работает нормально',
    example: {
      status: 'ok',
      timestamp: '2025-01-01T12:00:00.000Z',
      service: 'DriveCare API',
      version: '2.0',
      environment: 'development',
    },
  })
  @Get('health')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async getHealth() {
    const healthData = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: this.configService.get('SWAGGER_TITLE', 'DriveCare API'),
      version: this.configService.get('APP_VERSION', '2.0'),
      environment: this.configService.get('NODE_ENV', 'development'),
    };

    await this.auditService.log(AuditAction.HEALTH_CHECK_REQUESTED, {
      timestamp: healthData.timestamp,
      environment: healthData.environment,
    });

    return healthData;
  }

  /**
   * 👑 RESTRICTED: Superadmin information endpoint
   * 🚨 SECURITY: Доступен ТОЛЬКО в development и ТОЛЬКО для superadmin
   * 🔒 PRODUCTION: Endpoint полностью отключен в production environment
   */
  @ApiOperation({
    summary: '👑 Информация о суперадмине (ТОЛЬКО development + superadmin)',
    description: `
    🚨 SECURITY NOTICE:
    - Доступен ТОЛЬКО в development environment
    - Требует superadmin права доступа
    - Полностью отключен в production
    - Все обращения логируются в audit trail
    `,
  })
  @ApiResponse({
    status: 200,
    description: '✅ Информация о суперадмине',
    example: {
      exists: true,
      superadmin: {
        id: 'uuid',
        email: 'superadmin@drivecare.com',
        firstName: 'System',
        lastName: 'Administrator',
        isActive: true,
        role: { name: 'superadmin' },
      },
      environment: 'development',
      warning: 'This endpoint is disabled in production',
    },
  })
  @ApiResponse({
    status: 403,
    description: '🚫 Доступ запрещен - production environment или недостаточно прав',
  })
  @Get('superadmin-info')
  @AuthWithOwnership()
  @Roles('superadmin')
  @ApiBearerAuth('JWT-auth')
  @Throttle({ default: { limit: 5, ttl: 300000 } })
  async getSuperadminInfo() {
    const environment = this.configService.get('NODE_ENV', 'development');

    // 🚨 CRITICAL SECURITY: Блокируем в production
    if (environment === 'production') {
      await this.auditService.log(AuditAction.SUPERADMIN_INFO_BLOCKED_PRODUCTION, {
        environment,
        timestamp: new Date().toISOString(),
        message: 'Attempt to access superadmin-info in production environment',
      });

      throw new Error('This endpoint is disabled in production environment');
    }

    await this.auditService.log(AuditAction.SUPERADMIN_INFO_ACCESSED, {
      environment,
      timestamp: new Date().toISOString(),
      message: 'Superadmin information endpoint accessed',
    });

    // Если SeedsService недоступен (модуль не импортирован) — возвращаем безопасный ответ
    if (!this.seedsService) {
      await this.auditService.log(AuditAction.SUPERADMIN_INFO_ERROR, {
        environment,
        timestamp: new Date().toISOString(),
        reason: 'seeds_service_unavailable',
      });
      return {
        exists: null,
        superadmin: null,
        environment,
        warning: 'SeedsService is not available (module not loaded)',
        timestamp: new Date().toISOString(),
      };
    }

    try {
      const exists = await this.seedsService.checkSuperadminExists();
      const superadmin = exists ? await this.seedsService.getSuperadminInfo() : null;

      return {
        exists,
        superadmin,
        environment,
        warning: 'This endpoint is disabled in production',
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      await this.auditService.log(AuditAction.SUPERADMIN_INFO_ERROR, {
        environment,
        error: error.message,
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }
}
