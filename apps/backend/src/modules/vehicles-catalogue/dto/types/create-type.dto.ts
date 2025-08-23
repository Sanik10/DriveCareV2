// path: apps/backend/src/modules/vehicles-catalogue/dto/types/create-type.dto.ts
import { IsString, IsOptional, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CATALOGUE_CONSTANTS } from '../../constants/catalogue.constants';
import { Transform } from 'class-transformer';
import sanitizeHtml from 'sanitize-html';

function trimCollapse(value: any): any {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value;
}
function sanitize(value: any): any {
  if (typeof value !== 'string') return value;
  const cleaned = sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} });
  return cleaned.trim().replace(/\s+/g, ' ');
}

export class CreateTypeDto {
  @ApiProperty({
    example: 'Седан',
    description: 'Название типа транспортного средства',
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
    example: 'Легковой автомобиль с четырьмя дверями и отдельным багажным отделением',
    description: 'Подробное описание типа ТС',
    maxLength: CATALOGUE_CONSTANTS.VALIDATION.MAX_DESCRIPTION_LENGTH,
  })
  @Transform(({ value }) => sanitize(value))
  @IsString({ message: 'Описание должно быть строкой' })
  @MaxLength(CATALOGUE_CONSTANTS.VALIDATION.MAX_DESCRIPTION_LENGTH, {
    message: `Описание не может превышать ${CATALOGUE_CONSTANTS.VALIDATION.MAX_DESCRIPTION_LENGTH} символов`,
  })
  @IsOptional()
  description?: string;
}
