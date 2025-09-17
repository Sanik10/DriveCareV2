// path: apps/backend/src/modules/tariffs/dto/response/tariff-response.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TariffResponseDto {
  @ApiProperty({
    description: 'Уникальный идентификатор тарифа',
    example: '456e7890-e89b-12d3-a456-426614174001',
  })
  id: string;

  @ApiProperty({
    description: 'Название тарифного плана',
    example: 'Стандарт',
  })
  name: string;

  @ApiPropertyOptional({
    description: 'Описание тарифного плана',
    example: 'Идеальный выбор для средних автосервисов с базовой аналитикой',
  })
  description?: string;

  @ApiProperty({
    description: 'Цена за месяц (в рублях)',
    example: 2500,
  })
  priceMonthly: number;

  @ApiProperty({
    description: 'Цена за год (в рублях)',
    example: 25000,
  })
  priceYearly: number;

  @ApiPropertyOptional({
    description: 'Процент скидки при годовой оплате',
    example: 16.67,
  })
  yearlyDiscount?: number;

  @ApiPropertyOptional({
    description: 'Максимальное количество пользователей (null = безлимит)',
    example: 10,
  })
  maxUsers?: number | null;

  @ApiPropertyOptional({
    description: 'Максимальное количество клиентов (null = безлимит)',
    example: 200,
  })
  maxCustomers?: number | null;

  @ApiPropertyOptional({
    description: 'Максимальное количество транспортных средств (null = безлимит)',
    example: 500,
  })
  maxVehicles?: number | null;

  @ApiPropertyOptional({
    description: 'Максимальное количество заказов (null = безлимит)',
    example: 1000,
  })
  maxOrders?: number | null;

  @ApiPropertyOptional({
    description: 'Дополнительные возможности тарифа',
    example: {
      reports: true,
      analytics: false,
      api_access: false,
      priority_support: false,
      custom_fields: true,
    },
  })
  features?: Record<string, any>;

  @ApiProperty({
    description: 'Активен ли тарифный план',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: 'Дата создания',
    example: '2025-01-01T10:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Дата обновления',
    example: '2025-01-01T12:00:00.000Z',
  })
  updatedAt: Date;

  @ApiPropertyOptional({
    description: 'Популярность (количество активных подписок, уникальные компании сейчас)',
    example: 25,
  })
  subscriptionsCount?: number;

  @ApiPropertyOptional({
    description: 'Рекомендуется ли этот тариф',
    example: true,
  })
  isRecommended?: boolean;

  @ApiPropertyOptional({
    description: 'Активные подписчики на текущий момент (кол-во уникальных компаний)',
    example: 18,
  })
  activeSubscribers?: number;

  @ApiPropertyOptional({
    description: 'Сколько уникальных компаний когда-либо покупали этот тариф',
    example: 42,
  })
  totalSubscribers?: number;
}
