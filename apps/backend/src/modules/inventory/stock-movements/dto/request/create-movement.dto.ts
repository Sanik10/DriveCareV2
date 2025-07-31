// src/modules/inventory/stock-movements/dto/request/create-movement.dto.ts
import { IsEnum, IsNumber, IsOptional, IsString, IsUUID, IsDateString, Min, Max, MaxLength, IsPositive } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { StockMovementType, StockMovementReason } from '../../../constants/inventory.constants';
import { STOCK_MOVEMENT_CONSTRAINTS } from '../../types/stock-movements.types';

export class CreateMovementDto {
  @ApiProperty({ 
    description: 'ID запчасти для движения',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsUUID()
  partId: string;

  @ApiProperty({ 
    description: 'Тип движения',
    enum: ['receipt', 'issue', 'adjustment', 'transfer', 'reservation', 'release'],
    example: 'receipt'
  })
  @IsEnum(['receipt', 'issue', 'adjustment', 'transfer', 'reservation', 'release'])
  type: StockMovementType;

  @ApiProperty({ 
    description: 'Причина движения',
    enum: ['purchase', 'order_fulfillment', 'inventory_count', 'damage', 'expiry', 'loss', 'correction'],
    example: 'purchase'
  })
  @IsEnum(['purchase', 'order_fulfillment', 'inventory_count', 'damage', 'expiry', 'loss', 'correction'])
  reason: StockMovementReason;

  @ApiProperty({ 
    description: 'Количество (положительное для прихода, отрицательное для расхода)',
    example: 10,
    minimum: -99999,
    maximum: 99999
  })
  @IsNumber()
  @Min(-STOCK_MOVEMENT_CONSTRAINTS.MAX_QUANTITY)
  @Max(STOCK_MOVEMENT_CONSTRAINTS.MAX_QUANTITY)
  @Type(() => Number)
  quantity: number;

  @ApiPropertyOptional({ 
    description: 'Цена за единицу',
    example: 1500.00,
    minimum: 0
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @IsOptional()
  @Type(() => Number)
  price?: number;

  @ApiPropertyOptional({ 
    description: 'Общая сумма движения',
    example: 15000.00,
    minimum: 0
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @IsOptional()
  @Type(() => Number)
  totalAmount?: number;

  @ApiPropertyOptional({ 
    description: 'ID связанного заказа',
    example: '123e4567-e89b-12d3-a456-426614174001'
  })
  @IsUUID()
  @IsOptional()
  orderId?: string;

  @ApiPropertyOptional({ 
    description: 'ID поставщика',
    example: '123e4567-e89b-12d3-a456-426614174002'
  })
  @IsUUID()
  @IsOptional()
  supplierId?: string;

  @ApiPropertyOptional({ 
    description: 'Номер документа (накладная, счет и т.д.)',
    example: 'INV-2024-001',
    maxLength: 50
  })
  @IsString()
  @MaxLength(STOCK_MOVEMENT_CONSTRAINTS.MAX_DOCUMENT_NUMBER_LENGTH)
  @IsOptional()
  documentNumber?: string;

  @ApiPropertyOptional({ 
    description: 'Дополнительные заметки',
    example: 'Поступление от поставщика AutoParts Inc.',
    maxLength: 500
  })
  @IsString()
  @MaxLength(STOCK_MOVEMENT_CONSTRAINTS.MAX_NOTES_LENGTH)
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ 
    description: 'Дата движения (по умолчанию - текущая)',
    example: '2024-01-15T10:30:00Z',
    type: 'string',
    format: 'date-time'
  })
  @IsDateString()
  @IsOptional()
  movementDate?: string;
}
