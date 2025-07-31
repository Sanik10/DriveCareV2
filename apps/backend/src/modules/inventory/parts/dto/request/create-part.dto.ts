// src/modules/inventory/parts/dto/request/create-part.dto.ts
import { 
  IsString, 
  IsOptional, 
  IsBoolean, 
  IsNumber,
  IsUUID,
  Min,
  Max,
  MaxLength,
  MinLength,
  IsUrl,
  IsPositive,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { PARTS_CONSTANTS } from '../../constants/parts.constants';

export class CreatePartDto {
  @ApiProperty({ 
    description: 'ID категории запчасти',
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid'
  })
  @IsUUID(4, { message: 'ID категории должен быть валидным UUID' })
  categoryId: string;

  @ApiProperty({ 
    description: 'Название запчасти',
    example: 'Масляный фильтр',
    minLength: PARTS_CONSTANTS.VALIDATION.MIN_NAME_LENGTH,
    maxLength: PARTS_CONSTANTS.VALIDATION.MAX_NAME_LENGTH
  })
  @IsString({ message: 'Название должно быть строкой' })
  @MinLength(PARTS_CONSTANTS.VALIDATION.MIN_NAME_LENGTH, { 
    message: `Название должно содержать минимум ${PARTS_CONSTANTS.VALIDATION.MIN_NAME_LENGTH} символа` 
  })
  @MaxLength(PARTS_CONSTANTS.VALIDATION.MAX_NAME_LENGTH, { 
    message: `Название не может превышать ${PARTS_CONSTANTS.VALIDATION.MAX_NAME_LENGTH} символов` 
  })
  name: string;

  @ApiPropertyOptional({ 
    description: 'Номер/артикул запчасти',
    example: 'OF-001-2024',
    maxLength: PARTS_CONSTANTS.VALIDATION.MAX_PART_NUMBER_LENGTH
  })
  @IsString({ message: 'Номер запчасти должен быть строкой' })
  @MaxLength(PARTS_CONSTANTS.VALIDATION.MAX_PART_NUMBER_LENGTH, { 
    message: `Номер запчасти не может превышать ${PARTS_CONSTANTS.VALIDATION.MAX_PART_NUMBER_LENGTH} символов` 
  })
  @IsOptional()
  partNumber?: string;

  @ApiPropertyOptional({ 
    description: 'Бренд/производитель',
    example: 'Mann-Filter',
    maxLength: PARTS_CONSTANTS.VALIDATION.MAX_BRAND_LENGTH
  })
  @IsString({ message: 'Бренд должен быть строкой' })
  @MaxLength(PARTS_CONSTANTS.VALIDATION.MAX_BRAND_LENGTH, { 
    message: `Бренд не может превышать ${PARTS_CONSTANTS.VALIDATION.MAX_BRAND_LENGTH} символов` 
  })
  @IsOptional()
  brand?: string;

  @ApiPropertyOptional({ 
    description: 'Подробное описание запчасти',
    example: 'Высококачественный масляный фильтр для двигателей объемом 2.0л',
    maxLength: PARTS_CONSTANTS.VALIDATION.MAX_DESCRIPTION_LENGTH
  })
  @IsString({ message: 'Описание должно быть строкой' })
  @MaxLength(PARTS_CONSTANTS.VALIDATION.MAX_DESCRIPTION_LENGTH, { 
    message: `Описание не может превышать ${PARTS_CONSTANTS.VALIDATION.MAX_DESCRIPTION_LENGTH} символов` 
  })
  @IsOptional()
  description?: string;

  @ApiProperty({ 
    description: 'Себестоимость (цена закупки)',
    example: 850.50,
    minimum: PARTS_CONSTANTS.VALIDATION.MIN_PRICE,
    maximum: PARTS_CONSTANTS.VALIDATION.MAX_PRICE
  })
  @IsNumber({ maxDecimalPlaces: PARTS_CONSTANTS.VALIDATION.PRICE_DECIMAL_PLACES }, { 
    message: `Себестоимость может иметь максимум ${PARTS_CONSTANTS.VALIDATION.PRICE_DECIMAL_PLACES} знака после запятой` 
  })
  @Min(PARTS_CONSTANTS.VALIDATION.MIN_PRICE, { 
    message: `Себестоимость не может быть меньше ${PARTS_CONSTANTS.VALIDATION.MIN_PRICE}` 
  })
  @Max(PARTS_CONSTANTS.VALIDATION.MAX_PRICE, { 
    message: `Себестоимость не может превышать ${PARTS_CONSTANTS.VALIDATION.MAX_PRICE}` 
  })
  @Type(() => Number)
  costPrice: number;

  @ApiProperty({ 
    description: 'Цена продажи',
    example: 1200.00,
    minimum: PARTS_CONSTANTS.VALIDATION.MIN_PRICE,
    maximum: PARTS_CONSTANTS.VALIDATION.MAX_PRICE
  })
  @IsNumber({ maxDecimalPlaces: PARTS_CONSTANTS.VALIDATION.PRICE_DECIMAL_PLACES }, { 
    message: `Цена продажи может иметь максимум ${PARTS_CONSTANTS.VALIDATION.PRICE_DECIMAL_PLACES} знака после запятой` 
  })
  @Min(PARTS_CONSTANTS.VALIDATION.MIN_PRICE, { 
    message: `Цена продажи не может быть меньше ${PARTS_CONSTANTS.VALIDATION.MIN_PRICE}` 
  })
  @Max(PARTS_CONSTANTS.VALIDATION.MAX_PRICE, { 
    message: `Цена продажи не может превышать ${PARTS_CONSTANTS.VALIDATION.MAX_PRICE}` 
  })
  @Type(() => Number)
  sellingPrice: number;

  @ApiPropertyOptional({ 
    description: 'URL изображения запчасти',
    example: 'https://example.com/images/oil-filter.jpg',
    maxLength: PARTS_CONSTANTS.VALIDATION.MAX_IMAGE_URL_LENGTH
  })
  @IsUrl({}, { message: 'Некорректный URL изображения' })
  @MaxLength(PARTS_CONSTANTS.VALIDATION.MAX_IMAGE_URL_LENGTH, { 
    message: `URL изображения не может превышать ${PARTS_CONSTANTS.VALIDATION.MAX_IMAGE_URL_LENGTH} символов` 
  })
  @IsOptional()
  imageUrl?: string;

  @ApiPropertyOptional({ 
    description: 'Активна ли запчасть в каталоге',
    example: true,
    default: PARTS_CONSTANTS.DEFAULTS.DEFAULT_IS_ACTIVE
  })
  @IsBoolean({ message: 'Статус активности должен быть булевым значением' })
  @IsOptional()
  isActive?: boolean = PARTS_CONSTANTS.DEFAULTS.DEFAULT_IS_ACTIVE;
}

