// src/modules/invoices/dto/response/paginated-invoices-response.dto.ts (КРИТИЧЕСКИ ИСПРАВЛЕННЫЙ)
import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';
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

  // 🔒 КРИТИЧЕСКАЯ ЗАЩИТА: Финансовая статистика только для определенных ролей
  @ApiProperty({ description: 'Общая сумма всех счетов (только для manager+)' })
  @Exclude() // По умолчанию скрыто от cashier и mechanic
  @Expose({ groups: ['company_owner', 'company_admin', 'manager'] })
  totalAmount: number;

  @ApiProperty({ description: 'Сумма оплаченных счетов (только для manager+)' })
  @Exclude() // По умолчанию скрыто
  @Expose({ groups: ['company_owner', 'company_admin', 'manager'] })
  paidAmount: number;

  @ApiProperty({ description: 'Сумма неоплаченных счетов (только для manager+)' })
  @Exclude() // По умолчанию скрыто
  @Expose({ groups: ['company_owner', 'company_admin', 'manager'] })
  pendingAmount: number;

  @ApiProperty({ description: 'Количество просроченных счетов' })
  overdueCount: number; // Это может видеть даже cashier для работы

  // 🔒 ДОПОЛНИТЕЛЬНАЯ ЗАЩИТА: Детальная статистика только для топ-ролей
  @ApiProperty({ description: 'Средняя сумма счета (только для owner/admin)' })
  @Exclude()
  @Expose({ groups: ['company_owner', 'company_admin'] })
  averageAmount?: number;

  @ApiProperty({ description: 'Процент просроченных счетов (только для owner/admin)' })
  @Exclude()
  @Expose({ groups: ['company_owner', 'company_admin'] })
  overduePercentage?: number;
}
