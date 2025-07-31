import { IsString, IsOptional, Length } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CATEGORY_VALIDATION_MESSAGES } from '../../constants/categories.constants';

export class CreateCategoryDto {
  @ApiProperty({
    description: 'Название категории',
    example: 'Техническое обслуживание',
    maxLength: 100
  })
  @IsString({ message: CATEGORY_VALIDATION_MESSAGES.NAME_REQUIRED })
  @Length(1, 100, { message: CATEGORY_VALIDATION_MESSAGES.NAME_TOO_LONG })
  name: string;

  @ApiPropertyOptional({
    description: 'Описание категории',
    example: 'Плановое техническое обслуживание автомобилей',
    maxLength: 500
  })
  @IsOptional()
  @IsString()
  @Length(0, 500, { message: CATEGORY_VALIDATION_MESSAGES.DESCRIPTION_TOO_LONG })
  description?: string;
}
