// src/modules/inventory/suppliers/dto/response/supplier-analytics-response.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class MonthlyTrend {
  @ApiProperty({ description: 'Месяц', example: '2024-01' })
  month: string;

  @ApiProperty({ description: 'Количество заказов', example: 12 })
  ordersCount: number;

  @ApiProperty({ description: 'Общая сумма заказов', example: 185000.00 })
  totalValue: number;

  @ApiProperty({ description: 'Средний рейтинг за месяц', example: 4.3 })
  averageRating: number;

  @ApiProperty({ description: 'Процент доставок в срок', example: 91.7 })
  onTimeDeliveryRate: number;

  @ApiProperty({ description: 'Среднее время доставки', example: 3.5 })
  averageDeliveryTime: number;
}

class TopPart {
  @ApiProperty({ description: 'ID запчасти' })
  partId: string;

  @ApiProperty({ description: 'Название запчасти' })
  partName: string;

  @ApiProperty({ description: 'Номер запчасти' })
  partNumber: string;

  @ApiProperty({ description: 'Количество заказов', example: 15 })
  orderCount: number;

  @ApiProperty({ description: 'Общая сумма заказов', example: 45000.00 })
  totalValue: number;

  @ApiProperty({ description: 'Средняя цена', example: 3000.00 })
  averagePrice: number;

  @ApiProperty({ description: 'Последняя цена', example: 3200.00 })
  lastPrice: number;

  @ApiProperty({ description: 'Изменение цены в %', example: 6.7 })
  priceChange: number;

  @ApiProperty({ description: 'Дата последнего заказа' })
  lastOrderDate: Date;
}

class ComparisonMetrics {
  @ApiProperty({ description: 'Позиция по общему объему заказов', example: 2 })
  volumeRank: number;

  @ApiProperty({ description: 'Позиция по рейтингу', example: 1 })
  ratingRank: number;

  @ApiProperty({ description: 'Позиция по надежности доставки', example: 3 })
  reliabilityRank: number;

  @ApiProperty({ description: 'Доля в общих закупках компании (%)', example: 18.5 })
  marketShare: number;

  @ApiProperty({ description: 'Среднее по отрасли - рейтинг', example: 3.8 })
  industryAverageRating: number;

  @ApiProperty({ description: 'Среднее по отрасли - время доставки', example: 4.2 })
  industryAverageDeliveryTime: number;
}

class FinancialMetrics {
  @ApiProperty({ description: 'Общая сумма всех заказов', example: 2450000.00 })
  totalValue: number;

  @ApiProperty({ description: 'Средняя сумма заказа', example: 15705.13 })
  averageOrderValue: number;

  @ApiProperty({ description: 'Медианная сумма заказа', example: 12000.00 })
  medianOrderValue: number;

  @ApiProperty({ description: 'Самый крупный заказ', example: 85000.00 })
  largestOrder: number;

  @ApiProperty({ description: 'Непогашенная задолженность', example: 125000.00 })
  outstandingBalance: number;

  @ApiProperty({ description: 'Средняя задержка платежа (дни)', example: 2.3 })
  averagePaymentDelay: number;

  @ApiProperty({ description: 'Общая сумма скидок', example: 45000.00 })
  totalDiscounts: number;

  @ApiProperty({ description: 'Средний процент скидки', example: 1.8 })
  averageDiscountRate: number;
}

class QualityMetrics {
  @ApiProperty({ description: 'Процент брака', example: 1.2 })
  defectRate: number;

  @ApiProperty({ description: 'Процент возвратов', example: 0.8 })
  returnRate: number;

  @ApiProperty({ description: 'Количество жалоб', example: 3 })
  complaintsCount: number;

  @ApiProperty({ description: 'Процент решенных жалоб', example: 100.0 })
  resolvedComplaintsRate: number;

  @ApiProperty({ description: 'Среднее время решения жалоб (дни)', example: 2.1 })
  averageComplaintResolutionTime: number;
}

export class SupplierAnalyticsResponseDto {
  @ApiProperty({ description: 'ID поставщика' })
  supplierId: string;

  @ApiProperty({ description: 'Название поставщика' })
  supplierName: string;

  @ApiProperty({ description: 'Период анализа', enum: ['month', 'quarter', 'year'] })
  analyticsPeriod: 'month' | 'quarter' | 'year';

  @ApiProperty({ description: 'Дата начала периода' })
  periodStart: Date;

  @ApiProperty({ description: 'Дата окончания периода' })
  periodEnd: Date;

  // Основные KPI
  @ApiProperty({ description: 'Общее количество заказов', example: 156 })
  totalOrders: number;

  @ApiProperty({ description: 'Финансовые метрики' })
  financial: FinancialMetrics;

  @ApiProperty({ description: 'Метрики качества' })
  quality: QualityMetrics;

  // Временные метрики
  @ApiProperty({ description: 'Процент доставок в срок', example: 92.5 })
  onTimeDeliveryRate: number;

  @ApiProperty({ description: 'Среднее время доставки (дни)', example: 3.2 })
  averageDeliveryTime: number;

  @ApiProperty({ description: 'Минимальное время доставки (дни)', example: 1 })
  minimumDeliveryTime: number;

  @ApiProperty({ description: 'Максимальное время доставки (дни)', example: 7 })
  maximumDeliveryTime: number;

  // Рейтинги
  @ApiProperty({ description: 'Текущий средний рейтинг', example: 4.2 })
  currentRating: number;

  @ApiProperty({ description: 'Рейтинг в начале периода', example: 4.0 })
  periodStartRating: number;

  @ApiProperty({ description: 'Изменение рейтинга', example: 0.2 })
  ratingChange: number;

  @ApiProperty({ description: 'Тренд рейтинга', enum: ['improving', 'stable', 'declining'] })
  ratingTrend: 'improving' | 'stable' | 'declining';

  // Топ товары
  @ApiProperty({ description: 'Топ запчастей по объему заказов', type: [TopPart] })
  topParts: TopPart[];

  @ApiProperty({ description: 'Количество уникальных запчастей', example: 45 })
  uniquePartsCount: number;

  // Тренды по месяцам
  @ApiProperty({ description: 'Ежемесячная статистика', type: [MonthlyTrend] })
  monthlyTrends: MonthlyTrend[];

  // Сравнение с конкурентами
  @ApiProperty({ description: 'Сравнительные метрики' })
  comparison: ComparisonMetrics;

  // Прогнозы и рекомендации
  @ApiProperty({ description: 'Прогнозируемый объем на следующий период', example: 2800000.00 })
  predictedNextPeriodValue: number;

  @ApiProperty({ description: 'Рекомендации по оптимизации', type: [String] })
  recommendations: string[];

  @ApiProperty({ description: 'Риски и предупреждения', type: [String] })
  risks: string[];

  @ApiProperty({ description: 'Возможности для развития', type: [String] })
  opportunities: string[];

  // Контактная активность
  @ApiProperty({ description: 'Количество контактов за период', example: 25 })
  contactsCount: number;

  @ApiProperty({ description: 'Среднее время ответа (часы)', example: 4.2 })
  averageResponseTime: number;

  @ApiProperty({ description: 'Процент отвеченных запросов', example: 95.8 })
  responseRate: number;

  // Сезонность
  @ApiPropertyOptional({ description: 'Сезонные паттерны заказов' })
  seasonalityAnalysis?: {
    peakSeason: string;
    lowSeason: string;
    seasonalityStrength: number; // 0-1, где 1 = очень сезонный
  };

  @ApiProperty({ description: 'Дата генерации отчета' })
  generatedAt: Date;

  @ApiProperty({ description: 'Следующая дата обновления аналитики' })
  nextUpdateAt: Date;
}
