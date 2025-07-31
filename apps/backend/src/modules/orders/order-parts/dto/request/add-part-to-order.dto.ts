// src/modules/orders/order-parts/dto/request/add-part-to-order.dto.ts
import { IsUUID, IsOptional, IsNumber, IsPositive, IsBoolean, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class AddPartToOrderDto {
  @ApiProperty({ 
    description: 'ID запчасти из каталога', 
    example: '123e4567-e89b-12d3-a456-426614174001' 
  })
  @IsUUID()
  partId: string;

  @ApiPropertyOptional({ 
    description: 'Количество запчастей', 
    example: 2,
    default: 1,
    minimum: 1
  })
  @IsNumber()
  @IsPositive()
  @IsOptional()
  @Type(() => Number)
  quantity?: number;

  @ApiPropertyOptional({ 
    description: 'Индивидуальная цена запчасти (переопределяет базовую цену)', 
    example: 1500.00,
    minimum: 0
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  customPrice?: number;

  @ApiPropertyOptional({ 
    description: 'Процент скидки (0-100)', 
    example: 5.0,
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
    description: 'Предоставлена ли запчасть клиентом (не списывается со склада)', 
    example: false,
    default: false
  })
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  isCustomerProvided?: boolean;
}
