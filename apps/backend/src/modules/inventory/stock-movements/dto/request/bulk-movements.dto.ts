// src/modules/inventory/stock-movements/dto/request/bulk-movements.dto.ts
import { IsArray, IsOptional, IsString, IsUUID, MaxLength, ValidateNested, ArrayMaxSize, IsEnum, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { StockMovementType, StockMovementReason } from '../../../constants/inventory.constants';
import { STOCK_MOVEMENT_CONSTRAINTS } from '../../types/stock-movements.types';

export class BulkMovementItem {
  @ApiProperty({ description: 'ID запчасти' })
  @IsUUID()
  partId: string;

  @ApiProperty({ 
    description: 'Тип движения', 
    enum: ['receipt', 'issue', 'adjustment', 'transfer', 'reservation', 'release']
  })
  @IsEnum(['receipt', 'issue', 'adjustment', 'transfer', 'reservation', 'release'])
  type: StockMovementType;

  @ApiProperty({ 
    description: 'Причина движения',
    enum: ['purchase', 'order_fulfillment', 'inventory_count', 'damage', 'expiry', 'loss', 'correction']
  })
  @IsEnum(['purchase', 'order_fulfillment', 'inventory_count', 'damage', 'expiry', 'loss', 'correction'])
  reason: StockMovementReason;

  @ApiProperty({ description: 'Количество' })
  @IsNumber()
  @Min(-STOCK_MOVEMENT_CONSTRAINTS.MAX_QUANTITY)
  @Max(STOCK_MOVEMENT_CONSTRAINTS.MAX_QUANTITY)
  @Type(() => Number)
  quantity: number;

  @ApiPropertyOptional({ description: 'Цена за единицу' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  price?: number;

  @ApiPropertyOptional({ description: 'Заметки' })
  @IsString()
  @MaxLength(STOCK_MOVEMENT_CONSTRAINTS.MAX_NOTES_LENGTH)
  @IsOptional()
  notes?: string;
}

export class BulkMovementsDto {
  @ApiProperty({ 
    description: 'Список движений для создания',
    type: [BulkMovementItem],
    maxItems: 100
  })
  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMaxSize(STOCK_MOVEMENT_CONSTRAINTS.MAX_BULK_OPERATIONS)
  @Type(() => BulkMovementItem)
  movements: BulkMovementItem[];

  @ApiPropertyOptional({ 
    description: 'Общий номер документа для всех движений',
    example: 'BULK-INV-2024-001'
  })
  @IsString()
  @MaxLength(STOCK_MOVEMENT_CONSTRAINTS.MAX_DOCUMENT_NUMBER_LENGTH)
  @IsOptional()
  documentNumber?: string;

  @ApiPropertyOptional({ 
    description: 'ID поставщика для массового прихода'
  })
  @IsUUID()
  @IsOptional()
  supplierId?: string;

  @ApiPropertyOptional({ 
    description: 'ID заказа для массового расхода'
  })
  @IsUUID()
  @IsOptional()
  orderId?: string;

  @ApiPropertyOptional({ 
    description: 'Общие заметки для всех движений'
  })
  @IsString()
  @MaxLength(500)
  @IsOptional()
  globalNotes?: string;
}
