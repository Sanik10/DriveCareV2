// path: apps/backend/src/modules/vehicles-catalogue/dto/brands/merge-brand.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsNotEmpty } from 'class-validator';

export class MergeBrandDto {
  @ApiProperty({ example: 'target-brand-uuid' })
  @IsUUID(4)
  @IsNotEmpty()
  targetBrandId: string;
}
