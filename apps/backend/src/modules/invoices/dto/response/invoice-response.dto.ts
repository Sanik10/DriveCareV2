// src/modules/invoices/dto/response/invoice-response.dto.ts (КРИТИЧЕСКИ ИСПРАВЛЕННЫЙ)
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Exclude, Expose, Transform } from 'class-transformer';
import { InvoiceStatus } from '../../types/invoices.types';

// 🔒 ЗАЩИЩЕННЫЕ ВЛОЖЕННЫЕ ТИПЫ
class OrderInfo {
  @ApiProperty({ description: 'ID заказа' })
  id: string;

  @ApiProperty({ description: 'Номер заказа', example: 'ORD-2025-00001' })
  orderNumber: string;

  @ApiPropertyOptional({ description: 'Статус заказа' })
  status?: string;

  @ApiPropertyOptional({ description: 'Описание заказа' })
  description?: string;

  @ApiProperty({ description: 'Дата создания заказа' })
  createdAt: Date;
}

class CustomerInfo {
  @ApiProperty({ description: 'ID клиента' })
  id: string;

  @ApiPropertyOptional({ description: 'Имя клиента' })
  firstName?: string;

  @ApiPropertyOptional({ description: 'Фамилия клиента' })
  lastName?: string;

  @ApiPropertyOptional({ description: 'Название компании' })
  companyName?: string;

  // 🔒 КРИТИЧЕСКАЯ ЗАЩИТА: PII данные только для определенных ролей
  @ApiProperty({ description: 'Email клиента (только для manager+)' })
  @Exclude() // По умолчанию скрыто
  @Expose({ groups: ['company_owner', 'company_admin', 'manager'] })
  email: string;

  @ApiProperty({ description: 'Телефон клиента (только для manager+)' })
  @Exclude() // По умолчанию скрыто
  @Expose({ groups: ['company_owner', 'company_admin', 'manager'] })
  phone: string;

  @ApiProperty({ description: 'Тип клиента', enum: ['individual', 'company'] })
  type: string;
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

  @ApiPropertyOptional({ description: 'Марка и модель' })
  displayName?: string;
}

class CompanyInfo {
  @ApiProperty({ description: 'ID компании' })
  id: string;

  @ApiProperty({ description: 'Название компании' })
  name: string;

  @ApiPropertyOptional({ description: 'Юридическое название' })
  legalName?: string;

  // 🔒 КРИТИЧЕСКАЯ ЗАЩИТА: Sensitive business data только для топ-ролей
  @ApiPropertyOptional({ description: 'ИНН (только для owner/admin)' })
  @Exclude() // По умолчанию скрыто
  @Expose({ groups: ['company_owner', 'company_admin'] })
  taxNumber?: string;

  @ApiPropertyOptional({ description: 'Адрес' })
  address?: string;

  @ApiProperty({ description: 'Email компании' })
  email: string;

  @ApiPropertyOptional({ description: 'Телефон компании' })
  phone?: string;
}

export class InvoiceResponseDto {
  @ApiProperty({ description: 'Уникальный идентификатор' })
  id: string;

  @ApiProperty({ description: 'ID компании' })
  companyId: string;

  @ApiProperty({ description: 'ID заказа' })
  orderId: string;

  @ApiProperty({ description: 'Номер счета', example: 'INV-2025-00001' })
  invoiceNumber: string;

  @ApiProperty({ description: 'Статус счета', enum: InvoiceStatus })
  status: InvoiceStatus;

  @ApiProperty({ description: 'Дата выставления' })
  issueDate: Date;

  @ApiProperty({ description: 'Срок оплаты' })
  dueDate: Date;

  @ApiProperty({ description: 'Сумма без налогов', example: 15000 })
  amount: number;

  @ApiProperty({ description: 'Сумма налога', example: 3000 })
  taxAmount: number;

  @ApiProperty({ description: 'Общая сумма к оплате', example: 18000 })
  totalAmount: number;

  @ApiPropertyOptional({ description: 'Примечания к счету' })
  notes?: string;

  @ApiProperty({ description: 'Дата создания' })
  createdAt: Date;

  @ApiProperty({ description: 'Дата обновления' })
  updatedAt: Date;

  // 🔗 Связанная информация
  @ApiPropertyOptional({ description: 'Информация о заказе' })
  order?: OrderInfo;

  @ApiPropertyOptional({ description: 'Информация о клиенте' })
  customer?: CustomerInfo;

  @ApiPropertyOptional({ description: 'Информация об автомобиле' })
  vehicle?: VehicleInfo;

  @ApiPropertyOptional({ description: 'Информация о компании' })
  company?: CompanyInfo;

  @ApiPropertyOptional({ description: 'Платежи по счету', type: [Object] })
  payments?: any[]; // PaymentResponseDto[]

  // 📊 Вычисляемые поля
  @ApiProperty({ description: 'Читаемый статус', example: 'Выставлен' })
  displayStatus: string;

  @ApiProperty({ description: 'Просрочен ли счет' })
  isOverdue: boolean;

  @ApiProperty({ description: 'Дней до просрочки (отрицательное = просрочен)' })
  daysUntilDue: number;

  @ApiProperty({ description: 'Сумма к доплате', example: 18000 })
  remainingAmount: number;

  @ApiProperty({ description: 'Сумма уплачено', example: 0 })
  paidAmount: number;

  @ApiProperty({ description: 'Процент налога', example: 20 })
  taxPercentage: number;

  @ApiProperty({ description: 'Можно ли редактировать' })
  canEdit: boolean;

  @ApiProperty({ description: 'Можно ли отменить' })
  canCancel: boolean;

  @ApiProperty({ description: 'Можно ли оплатить' })
  canPay: boolean;
}
