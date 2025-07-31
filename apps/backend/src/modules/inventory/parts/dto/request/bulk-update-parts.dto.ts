// src/modules/inventory/parts/dto/request/bulk-update-parts.dto.ts
import { 
  IsArray, 
  IsUUID, 
  ValidateNested, 
  ArrayMinSize, 
  ArrayMaxSize,
  IsOptional,
  IsBoolean,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { PARTS_CONSTANTS } from '../../constants/parts.constants';

class BulkUpdateData {
  @ApiPropertyOptional({ 
    description: 'Новая категория для запчастей',
    format: 'uuid'
  })
  @IsUUID(4, { message: 'ID категории должен быть валидным UUID' })
  @IsOptional()
  categoryId?: string;

  @ApiPropertyOptional({ 
    description: 'Новая себестоимость',
    minimum: PARTS_CONSTANTS.VALIDATION.MIN_PRICE,
    maximum: PARTS_CONSTANTS.VALIDATION.MAX_PRICE
  })
  @IsNumber({ maxDecimalPlaces: PARTS_CONSTANTS.VALIDATION.PRICE_DECIMAL_PLACES })
  @Min(PARTS_CONSTANTS.VALIDATION.MIN_PRICE)
  @Max(PARTS_CONSTANTS.VALIDATION.MAX_PRICE)
  @Type(() => Number)
  @IsOptional()
  costPrice?: number;

  @ApiPropertyOptional({ 
    description: 'Новая цена продажи',
    minimum: PARTS_CONSTANTS.VALIDATION.MIN_PRICE,
    maximum: PARTS_CONSTANTS.VALIDATION.MAX_PRICE
  })
  @IsNumber({ maxDecimalPlaces: PARTS_CONSTANTS.VALIDATION.PRICE_DECIMAL_PLACES })
  @Min(PARTS_CONSTANTS.VALIDATION.MIN_PRICE)
  @Max(PARTS_CONSTANTS.VALIDATION.MAX_PRICE)
  @Type(() => Number)
  @IsOptional()
  sellingPrice?: number;

  @ApiPropertyOptional({ 
    description: 'Новый статус активности'
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class BulkUpdatePartsDto {
  @ApiProperty({ 
    description: 'Массив ID запчастей для обновления',
    example: ['123e4567-e89b-12d3-a456-426614174000', '987f6543-c21b-65d4-e789-123456789012'],
    type: [String]
  })
  @IsArray({ message: 'partIds должен быть массивом' })
  @ArrayMinSize(1, { message: 'Необходимо указать хотя бы одну запчасть' })
  @ArrayMaxSize(PARTS_CONSTANTS.DEFAULTS.BULK_OPERATION_MAX_ITEMS, { 
    message: `Нельзя обновить более ${PARTS_CONSTANTS.DEFAULTS.BULK_OPERATION_MAX_ITEMS} запчастей за раз` 
  })
  @IsUUID(4, { each: true, message: 'Каждый ID должен быть валидным UUID' })
  partIds: string[];

  @ApiProperty({ 
    description: 'Данные для обновления',
    type: BulkUpdateData
  })
  @ValidateNested()
  @Type(() => BulkUpdateData)
  updateData: BulkUpdateData;
}
