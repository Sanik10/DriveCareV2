import { IsArray, IsUUID, IsOptional, ValidateNested, ArrayMaxSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { AddServiceToOrderDto } from './add-service-to-order.dto';

class BulkServiceItem {
  @ApiProperty({ description: 'ID услуги' })
  @IsUUID()
  serviceId: string;

  @ApiProperty({ description: 'Количество', required: false, default: 1 })
  @IsOptional()
  quantity?: number;

  @ApiProperty({ description: 'Индивидуальная цена', required: false })
  @IsOptional()
  customPrice?: number;

  @ApiProperty({ description: 'Процент скидки', required: false })
  @IsOptional()
  discountPercent?: number;

  @ApiProperty({ description: 'ID механика', required: false })
  @IsOptional()
  mechanicId?: string;

  @ApiProperty({ description: 'Заметки', required: false })
  @IsOptional()
  notes?: string;
}

export class BulkAddServicesDto {
  @ApiProperty({ 
    description: 'Список услуг для добавления',
    type: [BulkServiceItem],
    maxItems: 20
  })
  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMaxSize(20)
  @Type(() => BulkServiceItem)
  services: BulkServiceItem[];
}
