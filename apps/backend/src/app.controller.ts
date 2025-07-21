import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';
import { SeedsService } from './database/seeds';

@ApiTags('🏠 Система')
@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly seedsService: SeedsService, // Добавляем SeedsService
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @ApiOperation({ summary: 'Проверка здоровья системы' })
  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'DriveCare API',
      version: '2.0'
    };
  }

  @ApiOperation({ 
    summary: '👑 Информация о суперадмине (только для разработки)',
    description: 'Получение информации о системном администраторе. Только для разработки!'
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
        role: { name: 'superadmin' }
      }
    }
  })
  @Get('superadmin-info')
  async getSuperadminInfo() {
    const exists = await this.seedsService.checkSuperadminExists();
    const superadmin = exists ? await this.seedsService.getSuperadminInfo() : null;
    
    return {
      exists,
      superadmin,
      note: 'This endpoint should be disabled in production'
    };
  }
}