// path: apps/backend/src/modules/vehicles-catalogue/dto/brands/create-brand.dto.ts
import { IsString, IsOptional, MaxLength, MinLength, IsUrl } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CATALOGUE_CONSTANTS } from '../../constants/catalogue.constants';
import { Transform } from 'class-transformer';

function trimCollapse(value: any): any {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value;
}

export class CreateBrandDto {
  @ApiProperty({
    example: 'Toyota',
    description: 'Название бренда автомобиля',
    minLength: CATALOGUE_CONSTANTS.VALIDATION.MIN_NAME_LENGTH,
    maxLength: CATALOGUE_CONSTANTS.VALIDATION.MAX_NAME_LENGTH,
  })
  @Transform(({ value }) => trimCollapse(value))
  @IsString({ message: 'Название должно быть строкой' })
  @MinLength(CATALOGUE_CONSTANTS.VALIDATION.MIN_NAME_LENGTH, {
    message: `Название должно содержать минимум ${CATALOGUE_CONSTANTS.VALIDATION.MIN_NAME_LENGTH} символа`,
  })
  @MaxLength(CATALOGUE_CONSTANTS.VALIDATION.MAX_NAME_LENGTH, {
    message: `Название не может превышать ${CATALOGUE_CONSTANTS.VALIDATION.MAX_NAME_LENGTH} символов`,
  })
  name: string;

  @ApiPropertyOptional({
    example: 'Япония',
    description: 'Страна происхождения бренда',
    maxLength: CATALOGUE_CONSTANTS.VALIDATION.MAX_COUNTRY_LENGTH,
  })
  @Transform(({ value }) => trimCollapse(value))
  @IsString({ message: 'Страна должна быть строкой' })
  @MaxLength(CATALOGUE_CONSTANTS.VALIDATION.MAX_COUNTRY_LENGTH, {
    message: `Страна не может превышать ${CATALOGUE_CONSTANTS.VALIDATION.MAX_COUNTRY_LENGTH} символов`,
  })
  @IsOptional()
  country?: string;

  @ApiPropertyOptional({
    example: 'https://example.com/toyota-logo.png',
    description: 'URL логотипа бренда',
    maxLength: CATALOGUE_CONSTANTS.VALIDATION.MAX_LOGO_URL_LENGTH,
  })
  @Transform(({ value }) => trimCollapse(value))
  @IsString({ message: 'URL логотипа должен быть строкой' })
  @IsUrl({}, { message: 'Некорректный формат URL' })
  @MaxLength(CATALOGUE_CONSTANTS.VALIDATION.MAX_LOGO_URL_LENGTH, {
    message: `URL не может превышать ${CATALOGUE_CONSTANTS.VALIDATION.MAX_LOGO_URL_LENGTH} символов`,
  })
  @IsOptional()
  logoUrl?: string;
}
