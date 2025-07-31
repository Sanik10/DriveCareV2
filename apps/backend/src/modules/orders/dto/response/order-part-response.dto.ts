// src/modules/orders/dto/response/order-part-response.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class PartInfo {
  @ApiProperty({ description: 'ID запчасти' })
  id: string;

  @ApiProperty({ description: 'Название запчасти' })
  name: string;

  @ApiPropertyOptional({ description: 'Номер запчасти' })
  partNumber?: string;

  @ApiPropertyOptional({ description: 'Бренд' })
  brand?: string;

  @ApiPropertyOptional({ description: 'Описание' })
  description?: string;
}

export class OrderPartResponseDto {
  @ApiProperty({ description: 'ID записи запчасти в заказе' })
  id: string;

  @ApiProperty({ description: 'ID заказа' })
  orderId: string;

  @ApiProperty({ description: 'ID запчасти' })
  partId: string;

  @ApiProperty({ description: 'Цена запчасти для данного заказа' })
  price: number;

  @ApiProperty({ description: 'Количество' })
  quantity: number;

  @ApiProperty({ description: 'Процент скидки' })
  discountPercent: number;

  @ApiProperty({ description: 'Общая сумма с учетом количества и скидки' })
  totalAmount: number;

  @ApiProperty({ description: 'Предоставлена ли запчасть клиентом' })
  isCustomerProvided: boolean;

  @ApiProperty({ description: 'Дата создания записи' })
  createdAt: Date;

  @ApiProperty({ description: 'Дата обновления записи' })
  updatedAt: Date;

  @ApiPropertyOptional({ description: 'Информация о запчасти' })
  part?: PartInfo;
}
