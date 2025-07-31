// src/modules/orders/dto/response/paginated-orders-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { OrderResponseDto } from './order-response.dto';

export class PaginatedOrdersResponseDto {
  @ApiProperty({ 
    description: 'Список заказов', 
    type: [OrderResponseDto] 
  })
  items: OrderResponseDto[];

  @ApiProperty({ 
    description: 'Общее количество заказов', 
    example: 150 
  })
  total: number;

  @ApiProperty({ 
    description: 'Номер текущей страницы', 
    example: 1 
  })
  page: number;

  @ApiProperty({ 
    description: 'Количество элементов на странице', 
    example: 20 
  })
  limit: number;

  @ApiProperty({ 
    description: 'Общее количество страниц', 
    example: 8 
  })
  totalPages: number;
}
