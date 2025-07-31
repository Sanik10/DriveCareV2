// src/modules/inventory/stock-movements/dto/request/barcode-movement.dto.ts
import { IsString, IsNumber, IsEnum, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class BarcodeScanMovementDto {
  @ApiProperty({ 
    description: 'Штрих-код запчасти',
    example: '1234567890123'
  })
  @IsString()
  @MaxLength(50)
  barcode: string;

  @ApiProperty({ 
    description: 'Количество',
    example: 5
  })
  @IsNumber()
  @Type(() => Number)
  quantity: number;

  @ApiProperty({ 
    description: 'Тип операции',
    enum: ['receipt', 'issue'],
    example: 'receipt'
  })
  @IsEnum(['receipt', 'issue'])
  type: 'receipt' | 'issue';

  @ApiPropertyOptional({ 
    description: 'Текущая локация',
    example: 'A1-B2'
  })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  location?: string;

  @ApiPropertyOptional({ 
    description: 'Заметки',
    example: 'Сканирование через мобильное приложение'
  })
  @IsString()
  @MaxLength(500)
  @IsOptional()
  notes?: string;
}
