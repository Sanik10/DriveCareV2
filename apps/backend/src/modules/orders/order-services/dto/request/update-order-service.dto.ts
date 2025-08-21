// path: src/modules/orders/order-services/dto/request/update-order-service.dto.ts
import { IsOptional, IsNumber, IsPositive, IsString, Min, Max, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import sanitizeHtml from 'sanitize-html';

export class UpdateOrderServiceDto {
  @ApiPropertyOptional({ description: 'Количество услуг', minimum: 1 })
  @IsNumber()
  @IsPositive()
  @IsOptional()
  @Type(() => Number)
  quantity?: number;

  @ApiPropertyOptional({ description: 'Цена услуги', minimum: 0 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  price?: number;

  @ApiPropertyOptional({ description: 'Процент скидки (0-100)', minimum: 0, maximum: 100 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  @IsOptional()
  @Type(() => Number)
  discountPercent?: number;

  @ApiPropertyOptional({ description: 'ID механика для назначения' })
  @IsUUID()
  @IsOptional()
  mechanicId?: string;

  @ApiPropertyOptional({ description: 'Заметки/комментарии по выполнению', maxLength: 1000 })
  @IsString()
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} }).trim() : value,
  )
  notes?: string;
}
