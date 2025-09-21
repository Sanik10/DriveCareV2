// path: apps/backend/src/modules/vehicles-catalogue/dto/types/update-type.dto.ts
import { PartialType, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateTypeDto } from './create-type.dto';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateTypeDto extends PartialType(CreateTypeDto) {
  @ApiPropertyOptional({
    example: true,
    description: 'Флаг активности типа ТС (включить/выключить тип)',
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
