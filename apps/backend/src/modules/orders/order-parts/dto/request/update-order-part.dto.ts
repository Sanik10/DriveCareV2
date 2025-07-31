// src/modules/orders/order-parts/dto/request/update-order-part.dto.ts
import { IsOptional, IsNumber, IsPositive, IsBoolean, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class UpdateOrderPartDto {
  @ApiPropertyOptional({ 
    description: 'Количество запчастей', 
    example: 3,
    minimum: 1
  })
  @IsNumber()
  @IsPositive()
  @IsOptional()
  @Type(() => Number)
  quantity?: number;

  @ApiPropertyOptional({ 
    description: 'Цена запчасти', 
    example: 1800.00,
    minimum: 0
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  price?: number;

  @ApiPropertyOptional({ 
    description: 'Процент скидки (0-100)', 
    example: 10.0,
    minimum: 0,
    maximum: 100
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  @IsOptional()
  @Type(() => Number)
  discountPercent?: number;

  @ApiPropertyOptional({ 
    description: 'Предоставлена ли запчасть клиентом', 
    example: true
  })
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  isCustomerProvided?: boolean;
}
