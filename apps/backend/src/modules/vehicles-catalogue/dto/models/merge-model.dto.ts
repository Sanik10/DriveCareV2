// path: apps/backend/src/modules/vehicles-catalogue/dto/models/merge-model.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsNotEmpty } from 'class-validator';

export class MergeModelDto {
  @ApiProperty({ example: 'target-model-uuid' })
  @IsUUID(4)
  @IsNotEmpty()
  targetModelId: string;
}
