// path: apps/backend/src/modules/subscriptions/subscription-billing/dto/request/process-payment.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsUUID,
  IsNumber,
  Min,
  Max,
  IsString,
  IsOptional,
  IsIn,
} from 'class-validator';

export class ProcessPaymentDto {
  @ApiProperty({ description: 'ID подписки', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsNotEmpty()
  @IsUUID(4)
  subscriptionId: string;

  // Сумма теперь опциональна — на сервере рассчитывается по тарифу и периоду
  @ApiPropertyOptional({ description: 'Сумма, ₽ (игнорируется сервером, используется только для справки)', example: 5000 })
  @IsOptional()
  @IsNumber()
  @Min(100)
  @Max(1_000_000)
  amount?: number;

  // Валюта фиксирована 'RUB' — сервер при необходимости подставит значение по умолчанию
  @ApiPropertyOptional({ description: 'Валюта', enum: ['RUB'], example: 'RUB', default: 'RUB' })
  @IsOptional()
  @IsIn(['RUB'])
  currency?: string;

  @ApiPropertyOptional({ description: 'Платёжный провайдер', enum: ['yookassa', 'tinkoff'], example: 'yookassa' })
  @IsOptional()
  @IsString()
  @IsIn(['yookassa', 'tinkoff'])
  gatewayProvider?: string;

  @ApiPropertyOptional({
    description: 'Способ оплаты',
    enum: ['card', 'mir', 'sbp', 'wallet', 'bank_transfer'],
    example: 'card',
  })
  @IsOptional()
  @IsString()
  @IsIn(['card', 'mir', 'sbp', 'wallet', 'bank_transfer'])
  paymentMethod?: string;

  @ApiPropertyOptional({ description: 'Метаданные (ограничение 10KB)' })
  @IsOptional()
  metadata?: Record<string, any>;
}
