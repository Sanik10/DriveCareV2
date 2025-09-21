// path: apps/backend/src/modules/vehicles-catalogue/dto/models/update-model.dto.ts
import { PartialType, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateModelDto } from './create-model.dto';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateModelDto extends PartialType(CreateModelDto) {
  @ApiPropertyOptional({
    example: true,
    description: 'Флаг активности модели (включить/выключить модель)',
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
