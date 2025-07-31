// src/modules/inventory/suppliers/dto/response/supplier-rating-response.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class RatingBreakdown {
  @ApiProperty({ description: 'Количество оценок "5"', example: 12 })
  excellent: number;

  @ApiProperty({ description: 'Количество оценок "4"', example: 8 })
  good: number;

  @ApiProperty({ description: 'Количество оценок "3"', example: 3 })
  average: number;

  @ApiProperty({ description: 'Количество оценок "2"', example: 1 })
  poor: number;

  @ApiProperty({ description: 'Количество оценок "1"', example: 0 })
  terrible: number;
}

class RatingTrend {
  @ApiProperty({ description: 'Период', example: '2024-Q1' })
  period: string;

  @ApiProperty({ description: 'Средний рейтинг за период', example: 4.2 })
  averageRating: number;

  @ApiProperty({ description: 'Количество оценок за период', example: 8 })
  ratingsCount: number;
}

class LatestRating {
  @ApiProperty({ description: 'ID оценки' })
  id: string;

  @ApiProperty({ description: 'Рейтинг качества (1-5)', example: 4 })
  qualityRating: number;

  @ApiProperty({ description: 'Рейтинг доставки (1-5)', example: 5 })
  deliveryRating: number;

  @ApiProperty({ description: 'Рейтинг цен (1-5)', example: 4 })
  priceRating: number;

  @ApiPropertyOptional({ description: 'Рейтинг коммуникации (1-5)', example: 4 })
  communicationRating?: number;

  @ApiProperty({ description: 'Общий рейтинг', example: 4.25 })
  overallRating: number;

  @ApiPropertyOptional({ description: 'Комментарий к оценке' })
  comment?: string;

  @ApiProperty({ description: 'Кто оценил' })
  ratedBy: {
    id: string;
    name: string;
    role: string;
  };

  @ApiProperty({ description: 'Дата оценки' })
  createdAt: Date;
}

export class SupplierRatingResponseDto {
  @ApiProperty({ description: 'ID поставщика' })
  supplierId: string;

  @ApiProperty({ description: 'Название поставщика' })
  supplierName: string;

  @ApiProperty({ description: 'Общий рейтинг поставщика (1-5)', example: 4.2 })
  overallRating: number;

  @ApiProperty({ description: 'Общее количество оценок', example: 24 })
  totalRatings: number;

  // Детализация по категориям
  @ApiProperty({ description: 'Средний рейтинг качества', example: 4.5 })
  averageQualityRating: number;

  @ApiProperty({ description: 'Средний рейтинг доставки', example: 4.0 })
  averageDeliveryRating: number;

  @ApiProperty({ description: 'Средний рейтинг цен', example: 4.1 })
  averagePriceRating: number;

  @ApiPropertyOptional({ description: 'Средний рейтинг коммуникации', example: 4.3 })
  averageCommunicationRating?: number;

  // Распределение оценок
  @ApiProperty({ description: 'Распределение оценок по качеству' })
  qualityBreakdown: RatingBreakdown;

  @ApiProperty({ description: 'Распределение оценок по доставке' })
  deliveryBreakdown: RatingBreakdown;

  @ApiProperty({ description: 'Распределение оценок по ценам' })
  priceBreakdown: RatingBreakdown;

  // Динамика рейтинга
  @ApiProperty({ description: 'Тренд изменения рейтинга', enum: ['improving', 'stable', 'declining'] })
  ratingTrend: 'improving' | 'stable' | 'declining';

  @ApiProperty({ description: 'Процентное изменение рейтинга за последний период', example: 5.2 })
  ratingChange: number;

  @ApiProperty({ description: 'История рейтингов по периодам', type: [RatingTrend] })
  ratingHistory: RatingTrend[];

  // Последние оценки
  @ApiProperty({ description: 'Последние 5 оценок', type: [LatestRating] })
  latestRatings: LatestRating[];

  // Сравнение с другими поставщиками
  @ApiProperty({ description: 'Позиция в рейтинге среди всех поставщиков компании', example: 3 })
  rankPosition: number;

  @ApiProperty({ description: 'Общее количество поставщиков в компании', example: 15 })
  totalSuppliersInCompany: number;

  @ApiProperty({ description: 'Процентиль рейтинга (лучше X% поставщиков)', example: 80 })
  percentileRank: number;

  // Рекомендации
  @ApiProperty({ description: 'Рекомендации по улучшению', type: [String] })
  recommendations: string[];

  @ApiProperty({ description: 'Сильные стороны поставщика', type: [String] })
  strengths: string[];

  @ApiProperty({ description: 'Области для улучшения', type: [String] })
  areasForImprovement: string[];

  @ApiProperty({ description: 'Дата последней оценки' })
  lastRatedAt: Date;

  @ApiProperty({ description: 'Следующая дата рекомендуемой оценки' })
  nextReviewDate: Date;

  // ✅ ДОБАВЛЯЕМ для использования в mapper'е:
  @ApiProperty({ description: 'Кто оценил' })
  ratedBy: string;

  @ApiProperty({ description: 'Рейтинг качества (1-5)', example: 4 })
  qualityRating: number;

  @ApiProperty({ description: 'Рейтинг доставки (1-5)', example: 5 })
  deliveryRating: number;

  @ApiProperty({ description: 'Рейтинг цен (1-5)', example: 4 })
  priceRating: number;

  @ApiPropertyOptional({ description: 'Рейтинг коммуникации (1-5)', example: 4 })
  communicationRating?: number;

  @ApiProperty({ description: 'Средний рейтинг', example: 4.25 })
  averageRating: number;

  @ApiPropertyOptional({ description: 'Комментарий к оценке' })
  comment?: string;

  @ApiProperty({ description: 'Дата создания оценки' })
  createdAt: Date;

  @ApiPropertyOptional({ description: 'Детализация по категориям' })
  ratingBreakdown?: {
    quality: number;
    delivery: number;
    price: number;
    communication?: number;
  };

  @ApiPropertyOptional({ description: 'Рекомендации по улучшению' })
  improvement?: {
    suggestions: string[];
    strongPoints: string[];
    weakPoints: string[];
  };
}
