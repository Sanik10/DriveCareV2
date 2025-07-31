import { IsOptional, IsNumber, IsPositive, IsString, Min, Max, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class UpdateOrderServiceDto {
  @ApiPropertyOptional({ 
    description: 'Количество услуг', 
    example: 2,
    minimum: 1
  })
  @IsNumber()
  @IsPositive()
  @IsOptional()
  @Type(() => Number)
  quantity?: number;

  @ApiPropertyOptional({ 
    description: 'Цена услуги', 
    example: 3000.00,
    minimum: 0
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  price?: number;

  @ApiPropertyOptional({ 
    description: 'Процент скидки (0-100)', 
    example: 15.0,
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
    description: 'ID механика для назначения на услугу', 
    example: '123e4567-e89b-12d3-a456-426614174002' 
  })
  @IsUUID()
  @IsOptional()
  mechanicId?: string;

  @ApiPropertyOptional({ 
    description: 'Заметки или комментарии по выполнению услуги', 
    example: 'Выявлен дополнительный износ тормозных дисков',
    maxLength: 1000
  })
  @IsString()
  @IsOptional()
  notes?: string;
}
