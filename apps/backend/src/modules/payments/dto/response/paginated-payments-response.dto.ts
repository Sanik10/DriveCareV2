// src/modules/payments/dto/response/paginated-payments-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { PaymentResponseDto } from './payment-response.dto';

export class PaginatedPaymentsResponseDto {
  @ApiProperty({ 
    description: 'Список платежей',
    type: [PaymentResponseDto]
  })
  items: PaymentResponseDto[];

  @ApiProperty({ 
    description: 'Общее количество платежей',
    example: 156
  })
  total: number;

  @ApiProperty({ 
    description: 'Текущая страница',
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

  @ApiProperty({ 
    description: 'Есть ли следующая страница',
    example: true
  })
  hasNext: boolean;

  @ApiProperty({ 
    description: 'Есть ли предыдущая страница',
    example: false
  })
  hasPrev: boolean;

  // 📊 ДОПОЛНИТЕЛЬНАЯ СТАТИСТИКА
  @ApiProperty({ 
    description: 'Общая сумма платежей на странице',
    example: 450000.00
  })
  totalAmount: number;

  @ApiProperty({ 
    description: 'Количество успешных платежей',
    example: 18
  })
  successfulPayments: number;

  @ApiProperty({ 
    description: 'Количество неудачных платежей',
    example: 2
  })
  failedPayments: number;

  @ApiProperty({ 
    description: 'Сумма возвратов',
    example: 25000.00
  })
  refundAmount: number;
}
