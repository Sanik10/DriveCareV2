import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SubscriptionStatus } from '../../types/subscriptions.types';

export class TariffInfoDto {
  @ApiProperty({ 
    description: 'ID тарифа',
    example: '456e7890-e89b-12d3-a456-426614174001'
  })
  id: string;

  @ApiProperty({ 
    description: 'Название тарифа',
    example: 'Стандарт'
  })
  name: string;

  @ApiProperty({ 
    description: 'Цена за месяц',
    example: 2500
  })
  priceMonthly: number;

  @ApiProperty({ 
    description: 'Цена за год',
    example: 25000
  })
  priceYearly: number;

  @ApiPropertyOptional({ 
    description: 'Максимальное количество пользователей',
    example: 10
  })
  maxUsers?: number;

  @ApiPropertyOptional({ 
    description: 'Максимальное количество клиентов',
    example: 200
  })
  maxCustomers?: number;

  @ApiPropertyOptional({ 
    description: 'Максимальное количество транспортных средств',
    example: 500
  })
  maxVehicles?: number;

  @ApiPropertyOptional({ 
    description: 'Максимальное количество заказов',
    example: 1000
  })
  maxOrders?: number;
}

export class SubscriptionResponseDto {
  @ApiProperty({ 
    description: 'Уникальный идентификатор подписки',
    example: '789e0123-e89b-12d3-a456-426614174002'
  })
  id: string;

  @ApiProperty({ 
    description: 'ID компании',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  companyId: string;

  @ApiPropertyOptional({ 
    description: 'Информация о тарифе',
    type: TariffInfoDto
  })
  tariff?: TariffInfoDto;

  @ApiProperty({ 
    description: 'Дата начала подписки',
    example: '2025-01-01T00:00:00.000Z'
  })
  startDate: Date;

  @ApiProperty({ 
    description: 'Дата окончания подписки',
    example: '2025-12-31T23:59:59.999Z'
  })
  endDate: Date;

  @ApiProperty({ 
    description: 'Статус подписки',
    enum: SubscriptionStatus,
    example: SubscriptionStatus.ACTIVE
  })
  status: SubscriptionStatus;

  @ApiProperty({ 
    description: 'Способ оплаты',
    example: 'bank_transfer'
  })
  paymentMethod: string;

  @ApiProperty({ 
    description: 'Автоматическое продление',
    example: false
  })
  autoRenew: boolean;

  @ApiProperty({ 
    description: 'Дата создания',
    example: '2025-01-01T10:00:00.000Z'
  })
  createdAt: Date;

  @ApiProperty({ 
    description: 'Дата обновления',
    example: '2025-01-01T12:00:00.000Z'
  })
  updatedAt: Date;
}
