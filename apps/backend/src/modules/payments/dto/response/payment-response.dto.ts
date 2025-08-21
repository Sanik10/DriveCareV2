// src/modules/payments/dto/response/payment-response.dto.ts (✅ SECURITY FIXED)
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentStatus, PaymentCurrency } from '../../types/payments.types';

export class PaymentResponseDto {
  @ApiProperty({ description: 'ID платежа', example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ description: 'ID компании', example: '123e4567-e89b-12d3-a456-426614174001' })
  companyId: string;

  @ApiProperty({ description: 'ID счета', example: '123e4567-e89b-12d3-a456-426614174002' })
  invoiceId: string;

  @ApiProperty({ description: 'ID способа оплаты', example: '123e4567-e89b-12d3-a456-426614174003' })
  paymentMethodId: string;

  @ApiProperty({ description: 'Сумма платежа', example: 15000.50 })
  amount: number;

  @ApiProperty({ description: 'Валюта платежа', enum: PaymentCurrency, example: PaymentCurrency.RUB })
  currency: PaymentCurrency;

  @ApiProperty({ description: 'Дата платежа', example: '2024-01-15T10:30:00Z' })
  paymentDate: Date;

  @ApiPropertyOptional({ description: 'ID транзакции', example: 'TXN_ABC123' })
  transactionId?: string;

  @ApiProperty({ description: 'Статус платежа', enum: PaymentStatus, example: PaymentStatus.PROCESSED })
  status: PaymentStatus;

  @ApiPropertyOptional({ description: 'Примечания к платежу', example: 'Оплата за услуги автосервиса' })
  notes?: string;

  @ApiProperty({ description: 'Дата создания', example: '2024-01-15T10:00:00Z' })
  createdAt: Date;

  @ApiProperty({ description: 'Дата последнего обновления', example: '2024-01-15T10:30:00Z' })
  updatedAt: Date;

  // ✅ ВАЛЮТНЫЕ ПОЛЯ (БЕЗОПАСНЫЕ)
  @ApiPropertyOptional({ description: 'Курс обмена валют', example: 75.50 })
  exchangeRate?: number;

  @ApiPropertyOptional({ description: 'Оригинальная сумма в другой валюте', example: 200.00 })
  originalAmount?: number;

  @ApiPropertyOptional({ description: 'Оригинальная валюта', enum: PaymentCurrency, example: PaymentCurrency.USD })
  originalCurrency?: PaymentCurrency;

  @ApiPropertyOptional({ description: 'Комиссия платежного шлюза', example: 45.50 })
  gatewayFee?: number;

  // ✅ НОВЫЕ БЕЗОПАСНЫЕ ПОЛЯ ВМЕСТО SENSITIVE DATA
  @ApiPropertyOptional({ 
    description: 'Статус обработки шлюзом', 
    example: 'approved',
    enum: ['pending', 'approved', 'declined', 'error', 'timeout']
  })
  gatewayStatus?: string;

  @ApiPropertyOptional({ 
    description: 'Маскированный номер карты (последние 4 цифры)', 
    example: '**** 1234'
  })
  maskedCardNumber?: string;

  @ApiPropertyOptional({ 
    description: 'Тип платежной системы', 
    example: 'Visa',
    enum: ['Visa', 'MasterCard', 'Mir', 'AmEx', 'UnionPay', 'JCB']
  })
  cardBrand?: string;

  @ApiPropertyOptional({ 
    description: 'Код авторизации (маскированный)', 
    example: 'AUTH***'
  })
  maskedAuthCode?: string;

  @ApiPropertyOptional({ 
    description: 'ID платежного терминала', 
    example: 'TERMINAL_001'
  })
  terminalId?: string;

  // ✅ СВЯЗАННЫЕ ДАННЫЕ
  @ApiPropertyOptional({ 
    description: 'Информация о счете',
    example: {
      invoiceNumber: 'INV-2024-001',
      totalAmount: 15000.50,
      status: 'paid'
    }
  })
  invoice?: {
    invoiceNumber: string;
    totalAmount: number;
    status: string;
  };

  @ApiPropertyOptional({ 
    description: 'Информация о способе оплаты',
    example: {
      name: 'Банковская карта *1234',
      type: 'card'
    }
  })
  paymentMethod?: {
    name: string;
    type: string;
  };

  // ✅ UI ДАННЫЕ
  @ApiProperty({ description: 'Цвет статуса для UI', example: '#10b981' })
  statusColor: string;

  @ApiProperty({ description: 'Отображаемый статус', example: 'Успешно обработан' })
  statusDisplay: string;

  // ✅ ДОПОЛНИТЕЛЬНЫЕ БЕЗОПАСНЫЕ МЕТАДАННЫЕ
  @ApiPropertyOptional({ 
    description: 'Безопасные метаданные (без чувствительной информации)',
    example: {
      source: 'mobile_app',
      version: '1.0.2',
      processed_by: 'AUTO'
    }
  })
  safeMetadata?: {
    source?: string;
    version?: string;
    processed_by?: string;
    campaign?: string;
    [key: string]: string | number | boolean | undefined;
  };
}
