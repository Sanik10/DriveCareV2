// path: src/modules/orders/order-services/dto/request/add-service-to-order.dto.ts
import { IsUUID, IsOptional, IsNumber, IsPositive, IsString, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import sanitizeHtml from 'sanitize-html';

export class AddServiceToOrderDto {
  @ApiProperty({ description: 'ID услуги из каталога' })
  @IsUUID()
  serviceId: string;

  @ApiPropertyOptional({ description: 'Количество услуг', default: 1, minimum: 1 })
  @IsNumber()
  @IsPositive()
  @IsOptional()
  @Type(() => Number)
  quantity?: number;

  @ApiPropertyOptional({ description: 'Индивидуальная цена услуги', minimum: 0 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  customPrice?: number;

  @ApiPropertyOptional({ description: 'Процент скидки (0-100)', minimum: 0, maximum: 100 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  @IsOptional()
  @Type(() => Number)
  discountPercent?: number;

  @ApiPropertyOptional({ description: 'ID механика для назначения на услугу' })
  @IsUUID()
  @IsOptional()
  mechanicId?: string;

  @ApiPropertyOptional({ description: 'Заметки/указания по услуге', maxLength: 1000 })
  @IsString()
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} }).trim() : value,
  )
  notes?: string;
}
