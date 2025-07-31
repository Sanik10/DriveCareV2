// src/modules/inventory/inventory-alerts/dto/request/test-notification.dto.ts
import { IsEnum, IsArray, IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AlertType, AlertPriority } from '../../../constants/inventory.constants';

export class TestNotificationDto {
  @ApiProperty({ 
    description: 'Тип тестового уведомления',
    enum: ['low_stock', 'out_of_stock', 'overstock', 'expired_reservation'],
    example: 'low_stock' 
  })
  @IsEnum(['low_stock', 'out_of_stock', 'overstock', 'expired_reservation'])
  type: AlertType;

  @ApiProperty({ 
    description: 'Приоритет уведомления',
    enum: ['low', 'medium', 'high', 'critical'],
    example: 'high' 
  })
  @IsEnum(['low', 'medium', 'high', 'critical'])
  priority: AlertPriority;

  @ApiPropertyOptional({ 
    description: 'Email адреса для отправки тестового уведомления',
    type: [String],
    example: ['test@company.com'] 
  })
  @IsArray()
  @IsEmail({}, { each: true })
  @IsOptional()
  recipients?: string[];

  @ApiPropertyOptional({ 
    description: 'Дополнительное сообщение',
    maxLength: 500,
    example: 'Тестирование системы уведомлений' 
  })
  @IsString()
  @MaxLength(500)
  @IsOptional()
  customMessage?: string;
}
