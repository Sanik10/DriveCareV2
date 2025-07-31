// src/modules/invoices/dto/response/paginated-invoices-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { InvoiceResponseDto } from './invoice-response.dto';

export class PaginatedInvoicesResponseDto {
  @ApiProperty({ description: 'Список счетов', type: [InvoiceResponseDto] })
  items: InvoiceResponseDto[];

  @ApiProperty({ description: 'Общее количество счетов', example: 150 })
  total: number;

  @ApiProperty({ description: 'Текущая страница', example: 1 })
  page: number;

  @ApiProperty({ description: 'Размер страницы', example: 20 })
  limit: number;

  @ApiProperty({ description: 'Общее количество страниц', example: 8 })
  totalPages: number;

  @ApiProperty({ description: 'Есть ли следующая страница' })
  hasNext: boolean;

  @ApiProperty({ description: 'Есть ли предыдущая страница' })
  hasPrev: boolean;

  // 📊 Дополнительная статистика для админки
  @ApiProperty({ description: 'Общая сумма всех счетов' })
  totalAmount: number;

  @ApiProperty({ description: 'Сумма оплаченных счетов' })
  paidAmount: number;

  @ApiProperty({ description: 'Сумма неоплаченных счетов' })
  pendingAmount: number;

  @ApiProperty({ description: 'Количество просроченных счетов' })
  overdueCount: number;
}
