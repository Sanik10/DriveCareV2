import { IsUUID, IsOptional, IsNumber, IsPositive, IsString, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class AddServiceToOrderDto {
  @ApiProperty({ 
    description: 'ID услуги из каталога', 
    example: '123e4567-e89b-12d3-a456-426614174001' 
  })
  @IsUUID()
  serviceId: string;

  @ApiPropertyOptional({ 
    description: 'Количество услуг', 
    example: 1,
    default: 1,
    minimum: 1
  })
  @IsNumber()
  @IsPositive()
  @IsOptional()
  @Type(() => Number)
  quantity?: number;

  @ApiPropertyOptional({ 
    description: 'Индивидуальная цена услуги (переопределяет базовую цену)', 
    example: 2500.00,
    minimum: 0
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  customPrice?: number;

  @ApiPropertyOptional({ 
    description: 'Процент скидки (0-100)', 
    example: 10.5,
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
    description: 'Заметки или особые указания по услуге', 
    example: 'Использовать оригинальные запчасти',
    maxLength: 1000
  })
  @IsString()
  @IsOptional()
  notes?: string;
}
