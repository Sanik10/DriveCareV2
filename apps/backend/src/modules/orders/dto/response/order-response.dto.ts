// src/modules/orders/dto/response/order-response.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderStatus } from '../../types/orders.types';

// Вложенные типы для связанных данных
class CustomerInfo {
  @ApiProperty({ description: 'ID клиента' })
  id: string;

  @ApiPropertyOptional({ description: 'Имя клиента' })
  firstName?: string;

  @ApiPropertyOptional({ description: 'Фамилия клиента' })
  lastName?: string;

  @ApiPropertyOptional({ description: 'Название компании' })
  companyName?: string;

  @ApiProperty({ description: 'Email клиента' })
  email: string;

  @ApiProperty({ description: 'Телефон клиента' })
  phone: string;

  @ApiProperty({ description: 'Тип клиента', enum: ['individual', 'company'] })
  type: string;
}

class VehicleBrandInfo {
  @ApiProperty({ description: 'ID бренда' })
  id: string;

  @ApiProperty({ description: 'Название бренда' })
  name: string;
}

class VehicleModelInfo {
  @ApiProperty({ description: 'ID модели' })
  id: string;

  @ApiProperty({ description: 'Название модели' })
  name: string;

  @ApiPropertyOptional({ description: 'Информация о бренде' })
  brand?: VehicleBrandInfo;
}

class VehicleInfo {
  @ApiProperty({ description: 'ID автомобиля' })
  id: string;

  @ApiPropertyOptional({ description: 'VIN номер' })
  vin?: string;

  @ApiPropertyOptional({ description: 'Госномер' })
  licensePlate?: string;

  @ApiPropertyOptional({ description: 'Год выпуска' })
  year?: number;

  @ApiPropertyOptional({ description: 'Цвет' })
  color?: string;

  @ApiPropertyOptional({ description: 'Пробег' })
  mileage?: number;

  @ApiPropertyOptional({ description: 'Информация о модели' })
  model?: VehicleModelInfo;
}

class UserInfo {
  @ApiProperty({ description: 'ID пользователя' })
  id: string;

  @ApiProperty({ description: 'Имя' })
  firstName: string;

  @ApiProperty({ description: 'Фамилия' })
  lastName: string;

  @ApiPropertyOptional({ description: 'Email (для создателя)' })
  email?: string;

  @ApiPropertyOptional({ description: 'Специализация (для механика)' })
  specialization?: string;
}

export class OrderResponseDto {
  @ApiProperty({ description: 'Уникальный идентификатор' })
  id: string;

  @ApiProperty({ description: 'ID компании' })
  companyId: string;

  @ApiProperty({ description: 'ID клиента' })
  customerId: string;

  @ApiProperty({ description: 'ID автомобиля' })
  vehicleId: string;

  @ApiProperty({ description: 'Номер заказ-наряда', example: 'ORD-2025-00001' })
  orderNumber: string;

  @ApiProperty({ description: 'Статус заказа', enum: OrderStatus })
  status: OrderStatus;

  @ApiProperty({ description: 'ID создателя заказа' })
  createdBy: string;

  @ApiPropertyOptional({ description: 'ID исполнителя' })
  assignedTo?: string;

  @ApiPropertyOptional({ description: 'Описание заказа' })
  description?: string;

  @ApiPropertyOptional({ description: 'Жалобы клиента' })
  customerComplaints?: string;

  @ApiPropertyOptional({ description: 'Результаты диагностики' })
  diagnosticResults?: string;

  @ApiProperty({ description: 'Общая сумма', example: 15000 })
  totalAmount: number;

  @ApiProperty({ description: 'Сумма скидки', example: 750 })
  discountAmount: number;

  @ApiProperty({ description: 'Сумма налога', example: 2850 })
  taxAmount: number;

  @ApiProperty({ description: 'Итоговая сумма к оплате', example: 17100 })
  finalAmount: number;

  @ApiPropertyOptional({ description: 'Пробег автомобиля' })
  mileage?: number;

  @ApiPropertyOptional({ description: 'Планируемое время завершения' })
  estimatedCompletionTime?: Date;

  @ApiPropertyOptional({ description: 'Фактическое время завершения' })
  actualCompletionTime?: Date;

  @ApiProperty({ description: 'Дата создания' })
  createdAt: Date;

  @ApiProperty({ description: 'Дата обновления' })
  updatedAt: Date;

  // 🔗 Связанная информация
  @ApiPropertyOptional({ description: 'Информация о клиенте' })
  customer?: CustomerInfo;

  @ApiPropertyOptional({ description: 'Информация об автомобиле' })
  vehicle?: VehicleInfo;

  @ApiPropertyOptional({ description: 'Информация о создателе' })
  createdByUser?: UserInfo;

  @ApiPropertyOptional({ description: 'Информация об исполнителе' })
  assignedToUser?: UserInfo;

  @ApiPropertyOptional({ description: 'Услуги в заказе', type: [Object] })
  orderServices?: any[]; // OrderServiceResponseDto[]

  @ApiPropertyOptional({ description: 'Запчасти в заказе', type: [Object] })
  orderParts?: any[]; // OrderPartResponseDto[]

  // 📊 Вычисляемые поля
  @ApiProperty({ description: 'Читаемый статус', example: 'В работе' })
  displayStatus: string;

  @ApiProperty({ description: 'Просрочен ли заказ' })
  isOverdue: boolean;

  @ApiProperty({ description: 'Процент выполнения', example: 50 })
  progressPercentage: number;

  @ApiPropertyOptional({ description: 'Предполагаемая длительность в часах' })
  estimatedDuration?: number;
}
