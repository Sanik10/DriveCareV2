// src/modules/payment-methods/dto/response/payment-method-response.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PaymentMethodStatsDto {
  @ApiProperty({ description: 'Количество транзакций', example: 150 })
  transactionCount: number;

  @ApiProperty({ description: 'Общий объем платежей', example: 250000.50 })
  totalVolume: number;

  @ApiProperty({ description: 'Средняя сумма платежа', example: 1666.67 })
  averageAmount: number;

  @ApiProperty({ description: 'Процент успешных платежей', example: 97.5 })
  successRate: number;

  @ApiProperty({ description: 'Общая сумма комиссий', example: 6250.25 })
  totalFees: number;
}

export class PaymentMethodResponseDto {
  @ApiProperty({ description: 'ID способа оплаты' })
  id: string;

  @ApiProperty({ description: 'ID компании' })
  companyId: string;

  @ApiProperty({ description: 'Название способа оплаты' })
  name: string;

  @ApiPropertyOptional({ description: 'Описание способа оплаты' })
  description?: string;

  @ApiProperty({ description: 'Тип платежного метода' })
  type: string;

  @ApiPropertyOptional({ description: 'Комиссия за обработку в процентах' })
  processingFeePercent?: number;

  @ApiProperty({ description: 'Активен ли способ оплаты' })
  isActive: boolean;

  @ApiPropertyOptional({ description: 'Лимиты платежей' })
  limits?: {
    minAmount?: number;
    maxAmount?: number;
    dailyTransactionLimit?: number;
  };

  @ApiPropertyOptional({ description: 'Настройки рассрочки' })
  installmentConfig?: {
    maxPeriodMonths: number;
    interestRate: number;
    minDownPaymentPercent: number;
  };

  @ApiPropertyOptional({ description: 'Статус интеграции' })
  integrationStatus?: {
    isConfigured: boolean;
    gatewayType?: string;
    testMode: boolean;
    lastConnectionCheck?: Date;
  };

  @ApiPropertyOptional({ description: 'Статистика использования', type: PaymentMethodStatsDto })
  stats?: PaymentMethodStatsDto;

  @ApiProperty({ description: 'Дата создания' })
  createdAt: Date;

  @ApiProperty({ description: 'Дата последнего обновления' })
  updatedAt: Date;
}
