// path: apps/backend/src/modules/services/dto/request/bulk-update-services.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayNotEmpty, IsArray, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { UpdateServiceDto } from './update-service.dto';

export class BulkUpdateServicesDto {
  @ApiProperty({
    description: 'Список ID услуг для массового обновления',
    type: [String],
    example: ['123e4567-e89b-12d3-a456-426614174000'],
  })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(100)
  @IsUUID('4', { each: true })
  serviceIds: string[];

  @ApiProperty({
    description: 'Изменения, применяемые к указанным услугам',
    type: UpdateServiceDto,
  })
  @ValidateNested()
  @Type(() => UpdateServiceDto)
  updates: UpdateServiceDto;
}
