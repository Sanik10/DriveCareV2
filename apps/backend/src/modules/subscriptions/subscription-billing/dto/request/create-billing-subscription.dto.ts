// path: apps/backend/src/modules/subscriptions/subscription-billing/dto/request/create-billing-subscription.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsUUID,
  IsBoolean,
  IsOptional,
  IsIP,
  IsString,
  MaxLength,
  IsIn,
  IsDate,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateBillingSubscriptionDto {
  @ApiProperty({ description: 'ID тарифа', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsNotEmpty()
  @IsUUID(4)
  tariffId: string;

  @ApiProperty({
    description: 'Период биллинга',
    enum: ['monthly', 'yearly'],
    example: 'monthly',
    default: 'monthly',
  })
  @IsNotEmpty()
  @IsString()
  @IsIn(['monthly', 'yearly'])
  billingPeriod: 'monthly' | 'yearly';

  @ApiPropertyOptional({
    description: 'Дата начала подписки (опционально, по умолчанию — текущая дата)',
    example: '2025-01-01T00:00:00.000Z',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startDate?: Date;

  @ApiProperty({ description: 'Согласие на обработку ПДн (ФЗ-152)', example: true })
  @IsNotEmpty()
  @IsBoolean()
  pdnConsentGiven: boolean;

  @ApiProperty({ description: 'Ознакомление с правами потребителей', example: true })
  @IsNotEmpty()
  @IsBoolean()
  consumerRightsAcknowledged: boolean;

  // Автопродление отключено политикой — true недопустим
  @ApiPropertyOptional({ description: 'Автопродление (отключено)', example: false, default: false })
  @IsOptional()
  @IsBoolean()
  autoRenew?: boolean;

  @ApiPropertyOptional({
    description: 'Способ оплаты',
    enum: ['manual', 'bank_transfer', 'card', 'mir', 'sbp', 'wallet'],
    example: 'card',
  })
  @IsOptional()
  @IsString()
  @IsIn(['manual', 'bank_transfer', 'card', 'mir', 'sbp', 'wallet'])
  paymentMethod?: string;

  @ApiPropertyOptional({ description: 'IP пользователя', example: '192.168.1.10' })
  @IsOptional()
  @IsIP(4)
  userIpAddress?: string;

  @ApiPropertyOptional({ description: 'User-Agent', example: 'Mozilla/5.0 ...' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  userAgent?: string;
}
