// path: apps/backend/src/modules/inventory/stock-movements/dto/request/update-movement.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import sanitizeHtml from 'sanitize-html';
import { STOCK_MOVEMENT_CONSTRAINTS } from '../../types/stock-movements.types';

export class UpdateMovementDto {
  @ApiPropertyOptional({ description: 'Цена за единицу' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  price?: number;

  @ApiPropertyOptional({ description: 'Общая сумма' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  totalAmount?: number;

  @ApiPropertyOptional({ description: 'Номер документа' })
  @IsString()
  @MaxLength(STOCK_MOVEMENT_CONSTRAINTS.MAX_DOCUMENT_NUMBER_LENGTH)
  @Transform(({ value }) =>
    typeof value === 'string'
      ? sanitizeHtml(value.trim(), { allowedTags: [], allowedAttributes: {} })
      : value,
  )
  @IsOptional()
  documentNumber?: string;

  @ApiPropertyOptional({ description: 'Заметки' })
  @IsString()
  @MaxLength(STOCK_MOVEMENT_CONSTRAINTS.MAX_NOTES_LENGTH)
  @Transform(({ value }) =>
    typeof value === 'string'
      ? sanitizeHtml(value.trim(), { allowedTags: [], allowedAttributes: {} })
      : value,
  )
  @IsOptional()
  notes?: string;
}
