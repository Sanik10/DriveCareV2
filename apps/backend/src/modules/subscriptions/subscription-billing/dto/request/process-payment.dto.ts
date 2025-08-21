import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID, IsNumber, Min, Max, IsString, IsOptional, IsIn } from 'class-validator';

export class ProcessPaymentDto {
  @ApiProperty({ description: 'ID подписки', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsNotEmpty()
  @IsUUID(4)
  subscriptionId: string;

  @ApiProperty({ description: 'Сумма, ₽', example: 5000, minimum: 100, maximum: 1000000 })
  @IsNotEmpty()
  @IsNumber()
  @Min(100)
  @Max(1_000_000)
  amount: number;

  @ApiProperty({ description: 'Валюта', enum: ['RUB'], example: 'RUB' })
  @IsNotEmpty()
  @IsIn(['RUB'])
  currency: string;

  @ApiPropertyOptional({ description: 'Платёжный провайдер', enum: ['yookassa', 'tinkoff'], example: 'yookassa' })
  @IsOptional()
  @IsString()
  @IsIn(['yookassa', 'tinkoff'])
  gatewayProvider?: string;

  @ApiPropertyOptional({ description: 'Способ оплаты', enum: ['card','mir','sbp','wallet','bank_transfer'], example: 'card' })
  @IsOptional()
  @IsString()
  @IsIn(['card','mir','sbp','wallet','bank_transfer'])
  paymentMethod?: string;

  @ApiPropertyOptional({ description: 'Метаданные (ограничение 10KB)' })
  @IsOptional()
  metadata?: Record<string, any>;
}
