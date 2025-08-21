// path: apps/backend/src/modules/inventory/parts/dto/request/create-part.dto.ts
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
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import sanitizeHtml from 'sanitize-html';
import { PARTS_CONSTANTS } from '../../constants/parts.constants';

const sanitizePlain = (v?: any) => {
  if (typeof v !== 'string') return v;
  return sanitizeHtml(v, { allowedTags: [], allowedAttributes: {} }).trim();
};

export class CreatePartDto {
  @ApiProperty({
    description: 'ID категории запчасти',
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid',
  })
  @IsUUID(4, { message: 'ID категории должен быть валидным UUID' })
  categoryId: string;

  @ApiProperty({
    description: 'Название запчасти',
    example: 'Масляный фильтр',
    minLength: PARTS_CONSTANTS.VALIDATION.MIN_NAME_LENGTH,
    maxLength: PARTS_CONSTANTS.VALIDATION.MAX_NAME_LENGTH,
  })
  @Transform(({ value }) => sanitizePlain(value))
  @IsString({ message: 'Название должно быть строкой' })
  @MinLength(PARTS_CONSTANTS.VALIDATION.MIN_NAME_LENGTH)
  @MaxLength(PARTS_CONSTANTS.VALIDATION.MAX_NAME_LENGTH)
  name: string;

  @ApiPropertyOptional({
    description: 'Номер/артикул запчасти',
    example: 'OF-001-2024',
    maxLength: PARTS_CONSTANTS.VALIDATION.MAX_PART_NUMBER_LENGTH,
  })
  @Transform(({ value }) => sanitizePlain(value))
  @IsString({ message: 'Номер запчасти должен быть строкой' })
  @MaxLength(PARTS_CONSTANTS.VALIDATION.MAX_PART_NUMBER_LENGTH)
  @Matches(/^[A-Za-z0-9._-]+$/, { message: 'Номер запчасти может содержать только буквы, цифры, "-", "_", "."' })
  @IsOptional()
  partNumber?: string;

  @ApiPropertyOptional({
    description: 'Бренд/производитель',
    example: 'Mann-Filter',
    maxLength: PARTS_CONSTANTS.VALIDATION.MAX_BRAND_LENGTH,
  })
  @Transform(({ value }) => sanitizePlain(value))
  @IsString({ message: 'Бренд должен быть строкой' })
  @MaxLength(PARTS_CONSTANTS.VALIDATION.MAX_BRAND_LENGTH)
  @IsOptional()
  brand?: string;

  @ApiPropertyOptional({
    description: 'Подробное описание запчасти',
    example: 'Высококачественный масляный фильтр для двигателей объемом 2.0л',
    maxLength: PARTS_CONSTANTS.VALIDATION.MAX_DESCRIPTION_LENGTH,
  })
  @Transform(({ value }) => sanitizePlain(value))
  @IsString({ message: 'Описание должно быть строкой' })
  @MaxLength(PARTS_CONSTANTS.VALIDATION.MAX_DESCRIPTION_LENGTH)
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Себестоимость (цена закупки)',
    example: 850.5,
    minimum: PARTS_CONSTANTS.VALIDATION.MIN_PRICE,
    maximum: PARTS_CONSTANTS.VALIDATION.MAX_PRICE,
  })
  @IsNumber({ maxDecimalPlaces: PARTS_CONSTANTS.VALIDATION.PRICE_DECIMAL_PLACES })
  @Min(PARTS_CONSTANTS.VALIDATION.MIN_PRICE)
  @Max(PARTS_CONSTANTS.VALIDATION.MAX_PRICE)
  @Type(() => Number)
  costPrice: number;

  @ApiProperty({
    description: 'Цена продажи',
    example: 1200.0,
    minimum: PARTS_CONSTANTS.VALIDATION.MIN_PRICE,
    maximum: PARTS_CONSTANTS.VALIDATION.MAX_PRICE,
  })
  @IsNumber({ maxDecimalPlaces: PARTS_CONSTANTS.VALIDATION.PRICE_DECIMAL_PLACES })
  @Min(PARTS_CONSTANTS.VALIDATION.MIN_PRICE)
  @Max(PARTS_CONSTANTS.VALIDATION.MAX_PRICE)
  @Type(() => Number)
  sellingPrice: number;

  @ApiPropertyOptional({
    description: 'URL изображения запчасти',
    example: 'https://example.com/images/oil-filter.jpg',
    maxLength: PARTS_CONSTANTS.VALIDATION.MAX_IMAGE_URL_LENGTH,
  })
  @IsUrl({}, { message: 'Некорректный URL изображения' })
  @MaxLength(PARTS_CONSTANTS.VALIDATION.MAX_IMAGE_URL_LENGTH)
  @IsOptional()
  imageUrl?: string;

  @ApiPropertyOptional({
    description: 'Активна ли запчасть в каталоге',
    example: true,
    default: PARTS_CONSTANTS.DEFAULTS.DEFAULT_IS_ACTIVE,
  })
  @IsBoolean({ message: 'Статус активности должен быть булевым значением' })
  @IsOptional()
  isActive?: boolean = PARTS_CONSTANTS.DEFAULTS.DEFAULT_IS_ACTIVE;
}
