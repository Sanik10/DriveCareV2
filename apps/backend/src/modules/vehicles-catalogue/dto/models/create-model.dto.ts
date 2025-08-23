// path: apps/backend/src/modules/vehicles-catalogue/dto/models/create-model.dto.ts
import { IsString, IsUUID, IsOptional, IsInt, Min, Max, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CATALOGUE_CONSTANTS } from '../../constants/catalogue.constants';
import { Transform } from 'class-transformer';

function trimCollapse(value: any): any {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value;
}

export class CreateModelDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'ID бренда автомобиля',
    format: 'uuid',
  })
  @IsUUID(4, { message: 'ID бренда должен быть валидным UUID' })
  brandId: string;

  @ApiProperty({
    example: 'Corolla',
    description: 'Название модели',
    minLength: CATALOGUE_CONSTANTS.VALIDATION.MIN_NAME_LENGTH,
    maxLength: CATALOGUE_CONSTANTS.VALIDATION.MAX_NAME_LENGTH,
  })
  @Transform(({ value }) => trimCollapse(value))
  @IsString({ message: 'Название модели должно быть строкой' })
  @MinLength(CATALOGUE_CONSTANTS.VALIDATION.MIN_NAME_LENGTH, {
    message: `Название должно содержать минимум ${CATALOGUE_CONSTANTS.VALIDATION.MIN_NAME_LENGTH} символа`,
  })
  @MaxLength(CATALOGUE_CONSTANTS.VALIDATION.MAX_NAME_LENGTH, {
    message: `Название не может превышать ${CATALOGUE_CONSTANTS.VALIDATION.MAX_NAME_LENGTH} символов`,
  })
  name: string;

  @ApiPropertyOptional({
    example: 1995,
    description: 'Год начала производства',
    minimum: CATALOGUE_CONSTANTS.VALIDATION.MIN_YEAR,
    maximum: CATALOGUE_CONSTANTS.VALIDATION.MAX_YEAR,
  })
  @IsInt({ message: 'Год должен быть целым числом' })
  @Min(CATALOGUE_CONSTANTS.VALIDATION.MIN_YEAR, {
    message: `Год не может быть раньше ${CATALOGUE_CONSTANTS.VALIDATION.MIN_YEAR}`,
  })
  @Max(CATALOGUE_CONSTANTS.VALIDATION.MAX_YEAR, {
    message: `Год не может быть позже ${CATALOGUE_CONSTANTS.VALIDATION.MAX_YEAR}`,
  })
  @IsOptional()
  yearFrom?: number;

  @ApiPropertyOptional({
    example: 2023,
    description: 'Год окончания производства',
    minimum: CATALOGUE_CONSTANTS.VALIDATION.MIN_YEAR,
    maximum: CATALOGUE_CONSTANTS.VALIDATION.MAX_YEAR,
  })
  @IsInt({ message: 'Год должен быть целым числом' })
  @Min(CATALOGUE_CONSTANTS.VALIDATION.MIN_YEAR, {
    message: `Год не может быть раньше ${CATALOGUE_CONSTANTS.VALIDATION.MIN_YEAR}`,
  })
  @Max(CATALOGUE_CONSTANTS.VALIDATION.MAX_YEAR, {
    message: `Год не может быть позже ${CATALOGUE_CONSTANTS.VALIDATION.MAX_YEAR}`,
  })
  @IsOptional()
  yearTo?: number;

  @ApiPropertyOptional({
    example: 'Седан',
    description: 'Класс автомобиля',
    maxLength: CATALOGUE_CONSTANTS.VALIDATION.MAX_CLASS_LENGTH,
  })
  @Transform(({ value }) => trimCollapse(value))
  @IsString({ message: 'Класс должен быть строкой' })
  @MaxLength(CATALOGUE_CONSTANTS.VALIDATION.MAX_CLASS_LENGTH, {
    message: `Класс не может превышать ${CATALOGUE_CONSTANTS.VALIDATION.MAX_CLASS_LENGTH} символов`,
  })
  @IsOptional()
  class?: string;
}
