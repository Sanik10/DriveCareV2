// src/modules/orders/order-parts/dto/response/order-parts-list-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { OrderPartResponseDto } from './order-part-response.dto';

export class OrderPartsListResponseDto {
  @ApiProperty({ description: 'ID заказа' })
  orderId: string;

  @ApiProperty({ 
    description: 'Список запчастей в заказе', 
    type: [OrderPartResponseDto] 
  })
  parts: OrderPartResponseDto[];

  @ApiProperty({ 
    description: 'Общее количество позиций запчастей в заказе', 
    example: 5 
  })
  totalParts: number;

  @ApiProperty({ 
    description: 'Общая стоимость всех запчастей', 
    example: 8750.00 
  })
  totalAmount: number;

  @ApiProperty({ 
    description: 'Количество запчастей, предоставленных клиентом', 
    example: 1 
  })
  customerProvidedCount: number;

  @ApiProperty({ 
    description: 'Количество наших запчастей (со склада)', 
    example: 4 
  })
  ourPartsCount: number;

  @ApiProperty({ 
    description: 'Статистика по категориям запчастей', 
    example: {
      'Тормозная система': 2,
      'Двигатель': 2,
      'Электрика': 1
    }
  })
  categoryStats?: Record<string, number>;

  @ApiProperty({ 
    description: 'Требуется ли проверка остатков на складе', 
    example: true 
  })
  needsInventoryCheck?: boolean;
}
