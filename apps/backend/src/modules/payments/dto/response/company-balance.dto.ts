// src/modules/payments/dto/response/company-balance.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { PaymentCurrency } from '../../types/payments.types';

export class CompanyBalanceDto {
  @ApiProperty({ 
    description: 'ID компании',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  companyId: string;

  @ApiProperty({ 
    description: 'Общая сумма полученных платежей',
    example: 2575000.00
  })
  totalReceived: number;

  @ApiProperty({ 
    description: 'Общая сумма возвратов',
    example: 125000.00
  })
  totalRefunded: number;

  @ApiProperty({ 
    description: 'Чистый баланс (поступления - возвраты)',
    example: 2450000.00
  })
  netBalance: number;

  @ApiProperty({ 
    description: 'Сумма ожидающих обработки платежей',
    example: 85000.00
  })
  pendingAmount: number;

  @ApiProperty({ 
    description: 'Сумма спорных платежей',
    example: 15000.00
  })
  disputedAmount: number;

  @ApiProperty({ 
    description: 'Баланс по валютам',
    example: {
      RUB: {
        received: 2300000.00,
        refunded: 100000.00,
        net: 2200000.00,
        pending: 75000.00
      },
      USD: {
        received: 200000.00,
        refunded: 20000.00,
        net: 180000.00,
        pending: 10000.00
      }
    }
  })
  balanceByCurrency: Record<PaymentCurrency, {
    received: number;
    refunded: number;
    net: number;
    pending: number;
  }>;

  @ApiProperty({ 
    description: 'Дата последнего обновления баланса',
    example: '2025-01-30T15:30:00.000Z'
  })
  lastUpdated: Date;

  // 📊 ДОПОЛНИТЕЛЬНАЯ АНАЛИТИКА
  @ApiProperty({ 
    description: 'Количество транзакций всего',
    example: 1250
  })
  totalTransactions: number;

  @ApiProperty({ 
    description: 'Средняя сумма транзакции',
    example: 20600.00
  })
  averageTransactionAmount: number;

  @ApiProperty({ 
    description: 'Баланс за последние 30 дней',
    example: 450000.00
  })
  last30DaysBalance: number;

  @ApiProperty({ 
    description: 'Процентное изменение относительно предыдущего месяца',
    example: 15.8
  })
  monthlyGrowthPercentage: number;
}
