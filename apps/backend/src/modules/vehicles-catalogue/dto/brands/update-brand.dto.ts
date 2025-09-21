// path: apps/backend/src/modules/vehicles-catalogue/dto/brands/update-brand.dto.ts
import { PartialType, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateBrandDto } from './create-brand.dto';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateBrandDto extends PartialType(CreateBrandDto) {
  @ApiPropertyOptional({
    example: true,
    description: 'Флаг активности бренда (включить/выключить бренд)',
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
