// src/modules/payments/dto/response/payment-statistics.dto.ts (ИСПРАВЛЕННАЯ ВЕРСИЯ)
import { ApiProperty } from '@nestjs/swagger';
import { PaymentStatus, PaymentCurrency } from '../../types/payments.types'; // ✅ ИСПРАВЛЕНО

export class PaymentStatisticsDto {
  @ApiProperty({ description: 'Общее количество платежей', example: 156 })
  total: number;

  @ApiProperty({ 
    description: 'Статистика по статусам',
    example: {
      [PaymentStatus.PROCESSED]: 120,
      [PaymentStatus.PENDING]: 25,
      [PaymentStatus.FAILED]: 8,
      [PaymentStatus.REFUNDED]: 3
    }
  })
  byStatus: Record<PaymentStatus, number>; // ✅ ИСПРАВЛЕНО

  @ApiProperty({ 
    description: 'Статистика по валютам',
    example: {
      [PaymentCurrency.RUB]: 140,
      [PaymentCurrency.USD]: 12,
      [PaymentCurrency.EUR]: 4
    }
  })
  byCurrency: Record<PaymentCurrency, number>;

  @ApiProperty({ 
    description: 'Статистика по способам оплаты',
    example: {
      'Банковская карта': 89,
      'Наличные': 45,
      'Банковский перевод': 22
    }
  })
  byPaymentMethod: Record<string, number>;

  @ApiProperty({ description: 'Общая сумма успешных платежей', example: 2450000.00 })
  totalAmount: number;

  @ApiProperty({ 
    description: 'Общие суммы по валютам',
    example: {
      [PaymentCurrency.RUB]: 2200000.00,
      [PaymentCurrency.USD]: 180000.00,
      [PaymentCurrency.EUR]: 70000.00
    }
  })
  totalAmountByCurrency: Record<PaymentCurrency, number>;

  @ApiProperty({ description: 'Количество платежей за текущий месяц', example: 45 })
  thisMonth: number;

  @ApiProperty({ description: 'Сумма платежей за текущий месяц', example: 680000.00 })
  thisMonthAmount: number;

  @ApiProperty({ description: 'Средняя сумма платежа', example: 15705.13 })
  avgPaymentAmount: number;

  @ApiProperty({ description: 'Среднее время обработки (секунды)', example: 300 })
  avgPaymentTime: number;

  @ApiProperty({ description: 'Процент успешных платежей', example: 76.92 })
  successRate: number;

  @ApiProperty({ description: 'Процент возвратов', example: 1.92 })
  refundRate: number;

  @ApiProperty({ 
    description: 'Трендовые данные по дням',
    example: [
      { date: '2024-01-15', amount: 125000, count: 8 },
      { date: '2024-01-16', amount: 89000, count: 6 }
    ]
  })
  dailyTrends: Array<{ date: string; amount: number; count: number }>;

  @ApiProperty({ 
    description: 'Почасовое распределение платежей',
    example: [
      { hour: 9, count: 12 },
      { hour: 10, count: 18 },
      { hour: 11, count: 15 }
    ]
  })
  hourlyDistribution: Array<{ hour: number; count: number }>;
}
