// src/modules/payment-methods/dto/response/paginated-payment-methods-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { PaymentMethodResponseDto } from './payment-method-response.dto';

export class PaymentMethodsPaginationDto {
  @ApiProperty({ description: 'Общее количество способов оплаты', example: 25 })
  total: number;

  @ApiProperty({ description: 'Текущая страница', example: 1 })
  page: number;

  @ApiProperty({ description: 'Количество элементов на странице', example: 20 })
  limit: number;

  @ApiProperty({ description: 'Общее количество страниц', example: 2 })
  totalPages: number;

  @ApiProperty({ description: 'Есть ли следующая страница', example: true })
  hasNext: boolean;

  @ApiProperty({ description: 'Есть ли предыдущая страница', example: false })
  hasPrevious: boolean;
}

export class PaginatedPaymentMethodsResponseDto {
  @ApiProperty({ description: 'Массив способов оплаты', type: [PaymentMethodResponseDto] })
  data: PaymentMethodResponseDto[];

  @ApiProperty({ description: 'Информация о пагинации', type: PaymentMethodsPaginationDto })
  pagination: PaymentMethodsPaginationDto;
}
