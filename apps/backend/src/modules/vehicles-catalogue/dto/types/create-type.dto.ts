import { IsString, IsOptional, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CATALOGUE_CONSTANTS } from '../../constants/catalogue.constants';

export class CreateTypeDto {
  @ApiProperty({ 
    example: 'Седан', 
    description: 'Название типа транспортного средства',
    minLength: CATALOGUE_CONSTANTS.VALIDATION.MIN_NAME_LENGTH,
    maxLength: CATALOGUE_CONSTANTS.VALIDATION.MAX_NAME_LENGTH
  })
  @IsString({ message: 'Название должно быть строкой' })
  @MinLength(CATALOGUE_CONSTANTS.VALIDATION.MIN_NAME_LENGTH, { 
    message: `Название должно содержать минимум ${CATALOGUE_CONSTANTS.VALIDATION.MIN_NAME_LENGTH} символа` 
  })
  @MaxLength(CATALOGUE_CONSTANTS.VALIDATION.MAX_NAME_LENGTH, { 
    message: `Название не может превышать ${CATALOGUE_CONSTANTS.VALIDATION.MAX_NAME_LENGTH} символов` 
  })
  name: string;

  @ApiPropertyOptional({ 
    example: 'Легковой автомобиль с четырьмя дверями и отдельным багажным отделением', 
    description: 'Подробное описание типа ТС',
    maxLength: CATALOGUE_CONSTANTS.VALIDATION.MAX_DESCRIPTION_LENGTH
  })
  @IsString({ message: 'Описание должно быть строкой' })
  @MaxLength(CATALOGUE_CONSTANTS.VALIDATION.MAX_DESCRIPTION_LENGTH, { 
    message: `Описание не может превышать ${CATALOGUE_CONSTANTS.VALIDATION.MAX_DESCRIPTION_LENGTH} символов` 
  })
  @IsOptional()
  description?: string;
}
