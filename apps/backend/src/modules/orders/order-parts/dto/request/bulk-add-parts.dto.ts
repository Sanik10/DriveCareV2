// src/modules/orders/order-parts/dto/request/bulk-add-parts.dto.ts
import { IsArray, ValidateNested, ArrayMaxSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { AddPartToOrderDto } from './add-part-to-order.dto';

export class BulkAddPartsDto {
  @ApiProperty({ 
    description: 'Массив запчастей для добавления в заказ',
    type: [AddPartToOrderDto],
    maxItems: 50
  })
  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMaxSize(50)
  @Type(() => AddPartToOrderDto)
  parts: AddPartToOrderDto[];
}
