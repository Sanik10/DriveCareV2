// src/modules/orders/order-parts/dto/response/order-part-response.dto.ts
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

  @ApiProperty({ description: 'Цена запчасти для данного заказа', example: 1500.00 })
  price: number;

  @ApiProperty({ description: 'Количество', example: 2 })
  quantity: number;

  @ApiProperty({ description: 'Процент скидки', example: 5.0 })
  discountPercent: number;

  @ApiProperty({ description: 'Общая сумма с учетом количества и скидки', example: 2850.00 })
  totalAmount: number;

  @ApiProperty({ description: 'Предоставлена ли запчасть клиентом' })
  isCustomerProvided: boolean;

  @ApiProperty({ description: 'Дата создания записи' })
  createdAt: Date;

  @ApiProperty({ description: 'Дата обновления записи' })
  updatedAt: Date;

  // 🔗 Связанная информация
  @ApiPropertyOptional({ description: 'Информация о запчасти' })
  part?: PartInfo;

  // 📊 Вычисляемые поля
  @ApiProperty({ description: 'Подытог без скидки', example: 3000.00 })
  subtotal: number;

  @ApiProperty({ description: 'Размер скидки в валюте', example: 150.00 })
  discountAmount: number;

  @ApiProperty({ description: 'Цена за единицу с учетом скидки', example: 1425.00 })
  unitPriceWithDiscount: number;

  @ApiProperty({ description: 'Наша запчасть (со склада)' })
  isOurPart: boolean;

  @ApiProperty({ description: 'Название категории', example: 'Тормозная система' })
  categoryName: string;

  @ApiProperty({ description: 'Статус для отображения', example: 'Наша' })
  displayStatus: string;

  @ApiPropertyOptional({ description: 'Себестоимость', example: 1200.00 })
  costPrice?: number;

  @ApiProperty({ description: 'Маржа в процентах', example: 18.75 })
  margin: number;

  @ApiProperty({ description: 'Сумма прибыли', example: 450.00 })
  profitAmount: number;
}
