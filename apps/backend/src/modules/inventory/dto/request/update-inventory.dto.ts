// path: apps/backend/src/modules/inventory/dto/request/update-inventory.dto.ts
import { IsOptional, IsNumber, IsString, IsDateString, Min, Max, MaxLength, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import { INVENTORY_CONSTANTS } from '../../constants/inventory.constants';
import sanitizeHtml from 'sanitize-html';

const sanitizePlain = (v?: any) => {
  if (typeof v !== 'string') return v;
  return sanitizeHtml(v, { allowedTags: [], allowedAttributes: {} }).trim();
};

export class UpdateInventoryDto {
  @ApiPropertyOptional({ description: 'Минимальное количество для уведомлений', example: 5, minimum: 0, maximum: 1000 })
  @IsNumber()
  @Min(INVENTORY_CONSTANTS.VALIDATION.MIN_QUANTITY.MIN)
  @Max(INVENTORY_CONSTANTS.VALIDATION.MIN_QUANTITY.MAX)
  @IsOptional()
  @Type(() => Number)
  minQuantity?: number;

  @ApiPropertyOptional({ description: 'Местоположение на складе', example: 'A1-B2', maxLength: 100, pattern: '^[A-Z0-9-]+$' })
  @Transform(({ value }) => sanitizePlain(value)?.toUpperCase())
  @IsString()
  @MaxLength(INVENTORY_CONSTANTS.VALIDATION.LOCATION.MAX_LENGTH)
  @Matches(INVENTORY_CONSTANTS.VALIDATION.LOCATION.PATTERN, {
    message: 'Местоположение должно содержать только буквы, цифры и дефисы (например: A1-B2)',
  })
  @IsOptional()
  location?: string;

  @ApiPropertyOptional({ description: 'Дата последнего пополнения', example: '2024-01-15T10:30:00Z', type: 'string', format: 'date-time' })
  @IsDateString()
  @IsOptional()
  lastRestockDate?: string;

  @ApiPropertyOptional({ description: 'Дополнительные заметки', example: 'Нужно заказать больше этой позиции', maxLength: 500 })
  @Transform(({ value }) => sanitizePlain(value))
  @IsString()
  @MaxLength(INVENTORY_CONSTANTS.VALIDATION.NOTES.MAX_LENGTH)
  @IsOptional()
  notes?: string;
}
