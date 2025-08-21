// path: apps/backend/src/modules/inventory/inventory-alerts/dto/request/test-notification.dto.ts
import { IsEnum, IsArray, IsEmail, IsOptional, IsString, MaxLength, ArrayMaxSize } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AlertType, AlertPriority } from '../../../constants/inventory.constants';
import { Transform } from 'class-transformer';
import sanitizeHtml from 'sanitize-html';
import { ALERTS_CONSTRAINTS } from '../../types/alerts.types';

export class TestNotificationDto {
  @ApiProperty({
    description: 'Тип тестового уведомления',
    enum: ['low_stock', 'out_of_stock', 'overstock', 'expired_reservation'],
    example: 'low_stock',
  })
  @IsEnum(['low_stock', 'out_of_stock', 'overstock', 'expired_reservation'])
  type: AlertType;

  @ApiProperty({
    description: 'Приоритет уведомления',
    enum: ['low', 'medium', 'high', 'critical'],
    example: 'high',
  })
  @IsEnum(['low', 'medium', 'high', 'critical'])
  priority: AlertPriority;

  @ApiPropertyOptional({
    description: 'Email адреса для отправки тестового уведомления',
    type: [String],
    example: ['test@company.com'],
  })
  @IsArray()
  @IsEmail({}, { each: true })
  @ArrayMaxSize(ALERTS_CONSTRAINTS.MAX_EMAIL_ADDRESSES)
  @Transform(({ value }) => (Array.isArray(value) ? value.map((e: string) => (e || '').trim()) : value))
  @IsOptional()
  recipients?: string[];

  @ApiPropertyOptional({
    description: 'Дополнительное сообщение',
    maxLength: 500,
    example: 'Тестирование системы уведомлений',
  })
  @IsString()
  @MaxLength(500)
  @Transform(({ value }) =>
    typeof value === 'string' ? sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} }).trim() : value,
  )
  @IsOptional()
  customMessage?: string;
}
