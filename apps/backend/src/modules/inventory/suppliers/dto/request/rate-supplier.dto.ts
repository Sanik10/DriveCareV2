// path: apps/backend/src/modules/inventory/suppliers/dto/request/rate-supplier.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, Min, Max, IsOptional, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import sanitizeHtml from 'sanitize-html';

export class RateSupplierDto {
  @ApiProperty({ description: 'Оценка качества (1-5)', minimum: 1, maximum: 5 })
  @IsNumber()
  @Min(1)
  @Max(5)
  qualityRating: number;

  @ApiProperty({ description: 'Оценка доставки (1-5)', minimum: 1, maximum: 5 })
  @IsNumber()
  @Min(1)
  @Max(5)
  deliveryRating: number;

  @ApiProperty({ description: 'Оценка цен (1-5)', minimum: 1, maximum: 5 })
  @IsNumber()
  @Min(1)
  @Max(5)
  priceRating: number;

  @ApiPropertyOptional({ description: 'Оценка коммуникации (1-5)', minimum: 1, maximum: 5 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  communicationRating?: number;

  @ApiPropertyOptional({ description: 'Комментарий к оценке', maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  @Transform(({ value }) =>
    typeof value === 'string'
      ? sanitizeHtml(value.trim(), { allowedTags: [], allowedAttributes: {} })
      : value,
  )
  comment?: string;
}