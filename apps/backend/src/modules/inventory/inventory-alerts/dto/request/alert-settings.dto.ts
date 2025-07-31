// src/modules/inventory/inventory-alerts/dto/request/alert-settings.dto.ts
import { 
  IsBoolean, 
  IsNumber, 
  IsArray, 
  IsEnum, 
  IsEmail,
  IsOptional,
  IsString,
  Min,
  Max,
  ArrayMaxSize,
  Matches,
  ValidateNested 
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { AlertType } from '../../../constants/inventory.constants';
import { ALERTS_CONSTRAINTS } from '../../types/alerts.types';

export class UpdateAlertSettingsDto {
  @ApiPropertyOptional({ 
    description: 'Включить email уведомления',
    default: true 
  })
  @IsBoolean()
  @IsOptional()
  enableEmailNotifications?: boolean;

  @ApiPropertyOptional({ 
    description: 'Включить push уведомления',
    default: true 
  })
  @IsBoolean()
  @IsOptional()
  enablePushNotifications?: boolean;

  @ApiPropertyOptional({ 
    description: 'Email адреса для уведомлений',
    type: [String],
    maxItems: ALERTS_CONSTRAINTS.MAX_EMAIL_ADDRESSES,
    example: ['manager@company.com', 'warehouse@company.com']
  })
  @IsArray()
  @IsEmail({}, { each: true })
  @ArrayMaxSize(ALERTS_CONSTRAINTS.MAX_EMAIL_ADDRESSES)
  @IsOptional()
  emailAddresses?: string[];

  @ApiPropertyOptional({ 
    description: 'Порог низкого остатка',
    minimum: 0,
    maximum: 1000,
    default: 5 
  })
  @IsNumber()
  @Min(0)
  @Max(1000)
  @IsOptional()
  lowStockThreshold?: number;

  @ApiPropertyOptional({ 
    description: 'Порог критического остатка',
    minimum: 0,
    maximum: 100,
    default: 2 
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  criticalStockThreshold?: number;

  @ApiPropertyOptional({ 
    description: 'Множитель для определения избытка',
    minimum: 2,
    maximum: 20,
    default: 5 
  })
  @IsNumber()
  @Min(2)
  @Max(20)
  @IsOptional()
  overstockMultiplier?: number;

  @ApiPropertyOptional({ 
    description: 'Включенные типы алертов',
    enum: ['low_stock', 'out_of_stock', 'overstock', 'expired_reservation'],
    isArray: true 
  })
  @IsArray()
  @IsEnum(['low_stock', 'out_of_stock', 'overstock', 'expired_reservation'], { each: true })
  @IsOptional()
  enabledAlertTypes?: AlertType[];

  @ApiPropertyOptional({ 
    description: 'Частота уведомлений',
    enum: ['immediate', 'hourly', 'daily'],
    default: 'immediate' 
  })
  @IsEnum(['immediate', 'hourly', 'daily'])
  @IsOptional()
  alertFrequency?: 'immediate' | 'hourly' | 'daily';

  @ApiPropertyOptional({ 
    description: 'Автоматически отклонять алерты после пополнения',
    default: true 
  })
  @IsBoolean()
  @IsOptional()
  autoDismissAfterRestock?: boolean;

  @ApiPropertyOptional({ 
    description: 'Автоматически отклонять алерты через часов',
    minimum: 1,
    maximum: 168,
    default: 72 
  })
  @IsNumber()
  @Min(1)
  @Max(168)  // Максимум неделя
  @IsOptional()
  autoDismissAfterHours?: number;

  @ApiPropertyOptional({ 
    description: 'Начало рабочего дня (HH:mm)',
    pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$',
    example: '09:00' 
  })
  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, { 
    message: 'Время должно быть в формате HH:mm' 
  })
  @IsOptional()
  workingHoursStart?: string;

  @ApiPropertyOptional({ 
    description: 'Конец рабочего дня (HH:mm)',
    pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$',
    example: '18:00' 
  })
  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, { 
    message: 'Время должно быть в формате HH:mm' 
  })
  @IsOptional()
  workingHoursEnd?: string;

  @ApiPropertyOptional({ 
    description: 'Рабочие дни недели (1=ПН, 7=ВС)',
    type: [Number],
    example: [1, 2, 3, 4, 5] 
  })
  @IsArray()
  @IsNumber({}, { each: true })
  @Min(1, { each: true })
  @Max(7, { each: true })
  @IsOptional()
  workingDays?: number[];

  @ApiPropertyOptional({ 
    description: 'Часовой пояс',
    example: 'Europe/Moscow' 
  })
  @IsString()
  @IsOptional()
  timezone?: string;
}
