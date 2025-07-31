import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderServiceStatus } from '../../../../../database/entities/order-service.entity';

// Вложенные типы для связанных данных
class ServiceInfo {
  @ApiProperty({ description: 'ID услуги' })
  id: string;

  @ApiProperty({ description: 'Название услуги' })
  name: string;

  @ApiPropertyOptional({ description: 'Описание услуги' })
  description?: string;

  @ApiProperty({ description: 'Базовая цена услуги' })
  basePrice: number;

  @ApiProperty({ description: 'Длительность в минутах' })
  durationMinutes: number;

  @ApiPropertyOptional({ description: 'Информация о категории' })
  category?: {
    id: string;
    name: string;
  };
}

class MechanicInfo {
  @ApiProperty({ description: 'ID механика' })
  id: string;

  @ApiProperty({ description: 'Имя механика' })
  firstName: string;

  @ApiProperty({ description: 'Фамилия механика' })
  lastName: string;

  @ApiPropertyOptional({ description: 'Специализация механика' })
  specialization?: string;
}

export class OrderServiceResponseDto {
  @ApiProperty({ description: 'ID записи услуги в заказе' })
  id: string;

  @ApiProperty({ description: 'ID заказа' })
  orderId: string;

  @ApiProperty({ description: 'ID услуги' })
  serviceId: string;

  @ApiProperty({ description: 'Цена услуги для данного заказа', example: 2500.00 })
  price: number;

  @ApiProperty({ description: 'Количество', example: 1 })
  quantity: number;

  @ApiProperty({ description: 'Процент скидки', example: 10.5 })
  discountPercent: number;

  @ApiProperty({ description: 'Общая сумма с учетом количества и скидки', example: 2237.50 })
  totalAmount: number;

  @ApiProperty({ 
    description: 'Статус выполнения услуги', 
    enum: OrderServiceStatus,
    example: OrderServiceStatus.PLANNED
  })
  status: OrderServiceStatus;

  @ApiPropertyOptional({ description: 'ID механика, выполняющего услугу' })
  mechanicId?: string;

  @ApiPropertyOptional({ description: 'Время начала выполнения' })
  startTime?: Date;

  @ApiPropertyOptional({ description: 'Время завершения выполнения' })
  endTime?: Date;

  @ApiPropertyOptional({ description: 'Заметки по выполнению услуги' })
  notes?: string;

  @ApiProperty({ description: 'Дата создания записи' })
  createdAt: Date;

  @ApiProperty({ description: 'Дата обновления записи' })
  updatedAt: Date;

  // 🔗 Связанная информация
  @ApiPropertyOptional({ description: 'Информация об услуге' })
  service?: ServiceInfo;

  @ApiPropertyOptional({ description: 'Информация о механике' })
  mechanic?: MechanicInfo;

  // 📊 Вычисляемые поля
  @ApiProperty({ description: 'Читаемый статус', example: 'Запланирована' })
  displayStatus: string;

  @ApiProperty({ description: 'Услуга выполняется' })
  isInProgress: boolean;

  @ApiProperty({ description: 'Услуга завершена' })
  isCompleted: boolean;

  @ApiPropertyOptional({ description: 'Длительность выполнения в минутах' })
  duration?: number;

  @ApiProperty({ description: 'Цена с учетом скидки за единицу', example: 2237.50 })
  priceWithDiscount: number;

  @ApiProperty({ description: 'Размер скидки в валюте', example: 262.50 })
  discountAmount: number;
}
