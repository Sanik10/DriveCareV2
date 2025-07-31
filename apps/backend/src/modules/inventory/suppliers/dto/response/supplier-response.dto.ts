// src/modules/inventory/suppliers/dto/response/supplier-response.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SupplierType } from '../../types/suppliers.types';

class SupplierRatingInfo {
  @ApiProperty({ description: 'Общий рейтинг поставщика (1-5)', example: 4.2 })
  overallRating: number;

  @ApiProperty({ description: 'Рейтинг качества (1-5)', example: 4.5 })
  qualityRating: number;

  @ApiProperty({ description: 'Рейтинг доставки (1-5)', example: 4.0 })
  deliveryRating: number;

  @ApiProperty({ description: 'Рейтинг цен (1-5)', example: 4.1 })
  priceRating: number;

  @ApiPropertyOptional({ description: 'Рейтинг коммуникации (1-5)', example: 4.3 })
  communicationRating?: number;

  @ApiProperty({ description: 'Количество оценок', example: 25 })
  totalRatings: number;

  @ApiPropertyOptional({ description: 'Дата последней оценки' })
  lastRatedAt?: Date;
}

class SupplierStatistics {
  @ApiProperty({ description: 'Общее количество заказов', example: 156 })
  totalOrders: number;

  @ApiProperty({ description: 'Общая сумма заказов', example: 2450000.00 })
  totalValue: number;

  @ApiProperty({ description: 'Средняя сумма заказа', example: 15705.13 })
  averageOrderValue: number;

  @ApiProperty({ description: 'Процент доставок в срок', example: 92.5 })
  onTimeDeliveryRate: number;

  @ApiProperty({ description: 'Среднее время доставки в днях', example: 3.2 })
  averageDeliveryTime: number;

  @ApiPropertyOptional({ description: 'Дата последнего заказа' })
  lastOrderDate?: Date;

  @ApiProperty({ description: 'Количество активных контрактов', example: 3 })
  activeContracts: number;

  @ApiProperty({ description: 'Процент брака', example: 1.2 })
  defectRate: number;

  @ApiProperty({ description: 'Процент возвратов', example: 0.8 })
  returnRate: number;
}

export class SupplierResponseDto {
  @ApiProperty({ description: 'ID поставщика' })
  id: string;

  @ApiProperty({ description: 'ID компании' })
  companyId: string;

  @ApiProperty({ description: 'Название поставщика', example: 'AutoParts Distribution LLC' })
  name: string;

  @ApiPropertyOptional({ description: 'Контактное лицо', example: 'Иван Петров' })
  contactName?: string;

  @ApiPropertyOptional({ description: 'Email поставщика', example: 'sales@autoparts.com' })
  email?: string;

  @ApiPropertyOptional({ description: 'Телефон поставщика', example: '+7 (495) 123-45-67' })
  phone?: string;

  @ApiPropertyOptional({ description: 'Адрес поставщика' })
  address?: string;

  @ApiPropertyOptional({ description: 'Город', example: 'Москва' })
  city?: string;

  @ApiPropertyOptional({ description: 'Страна', example: 'Россия' })
  country?: string;

  @ApiPropertyOptional({ description: 'Веб-сайт поставщика', example: 'https://autoparts.com' })
  website?: string;

  @ApiPropertyOptional({ description: 'ИНН или налоговый номер', example: '7701234567' })
  taxNumber?: string;

  @ApiProperty({ 
    description: 'Тип поставщика',
    enum: ['manufacturer', 'distributor', 'wholesaler', 'retailer', 'service_provider', 'other'],
    example: 'distributor'
  })
  supplierType: SupplierType;

  @ApiProperty({ description: 'Отображаемое название типа', example: 'Дистрибьютор' })
  supplierTypeDisplay: string;

  @ApiPropertyOptional({ 
    description: 'Условия оплаты',
    example: 'Предоплата 50%, остальное в течение 14 дней'
  })
  paymentTerms?: string;

  @ApiPropertyOptional({ 
    description: 'Условия доставки',
    example: 'Доставка по Москве в течение 2-3 дней'
  })
  deliveryTerms?: string;

  @ApiPropertyOptional({ 
    description: 'Дополнительные заметки',
    example: 'Надежный поставщик оригинальных запчастей'
  })
  notes?: string;

  @ApiProperty({ description: 'Активен ли поставщик', example: true })
  isActive: boolean;

  @ApiProperty({ description: 'Дата создания записи' })
  createdAt: Date;

  @ApiProperty({ description: 'Дата обновления записи' })
  updatedAt: Date;

  // 📊 Рейтинги и статистика
  @ApiPropertyOptional({ description: 'Информация о рейтингах' })
  rating?: SupplierRatingInfo;

  @ApiPropertyOptional({ description: 'Статистика по поставщику' })
  statistics?: SupplierStatistics;

  // 🏆 Вычисляемые поля
  @ApiProperty({ description: 'Является ли предпочтительным поставщиком', example: true })
  isPreferred: boolean;

  @ApiProperty({ description: 'Уровень надежности', enum: ['low', 'medium', 'high', 'excellent'], example: 'high' })
  reliabilityLevel: 'low' | 'medium' | 'high' | 'excellent';

  @ApiProperty({ description: 'Статус сотрудничества', enum: ['new', 'active', 'preferred', 'problematic'], example: 'active' })
  cooperationStatus: 'new' | 'active' | 'preferred' | 'problematic';

  @ApiPropertyOptional({ description: 'Значки поставщика' })
  badges?: string[]; // ["Надежный", "Выгодный", "Быстрый"]

  @ApiPropertyOptional({ description: 'Предупреждения' })
  warnings?: string[]; // ["Задержки доставки", "Высокий процент брака"]

  @ApiProperty({ description: 'Можно ли редактировать поставщика', example: true })
  canEdit: boolean;

  @ApiProperty({ description: 'Можно ли деактивировать поставщика', example: true })
  canDeactivate: boolean;

  @ApiPropertyOptional({ description: 'Причина блокировки (если заблокирован)' })
  blockReason?: string;

  // ✅ ДОБАВЛЯЕМ недостающие поля из mapper'а:
  @ApiProperty({ 
    description: 'Предпочтительный способ связи',
    enum: ['phone', 'email', 'whatsapp'],
    example: 'phone'
  })
  preferredContact: 'phone' | 'email' | 'whatsapp';

  @ApiPropertyOptional({ description: 'Теги поставщика' })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Бизнес-метрики' })
  businessMetrics?: {
    reliability: number;
    costEffectiveness: number;
    serviceQuality: number;
    overallScore: number;
  };
}
