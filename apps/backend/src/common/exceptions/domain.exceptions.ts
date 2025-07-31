import { NotFoundException, ConflictException, ForbiddenException, BadRequestException } from '@nestjs/common';

// ====== COMPANIES EXCEPTIONS ======
export class CompanyNotFoundException extends NotFoundException {
  constructor(id: string) {
    super(`Компания с ID ${id} не найдена`);
  }
}

export class CompanyEmailAlreadyExistsException extends ConflictException {
  constructor(email: string) {
    super(`Компания с email ${email} уже существует`);
  }
}

export class CompanyAccessDeniedException extends ForbiddenException {
  constructor(action: string) {
    super(`Недостаточно прав для выполнения действия: ${action}`);
  }
}

// ====== SUBSCRIPTIONS EXCEPTIONS ======
export class SubscriptionNotFoundException extends NotFoundException {
  constructor(id: string) {
    super(`Подписка с ID ${id} не найдена`);
  }
}

export class ActiveSubscriptionExistsException extends ConflictException {
  constructor(companyId: string) {
    super(`У компании ${companyId} уже есть активная подписка`);
  }
}

export class SubscriptionStatusTransitionException extends BadRequestException {
  constructor(fromStatus: string, toStatus: string) {
    super(`Невозможно изменить статус подписки с ${fromStatus} на ${toStatus}`);
  }
}

// ====== TARIFFS EXCEPTIONS ======
export class TariffNotFoundException extends NotFoundException {
  constructor(id: string) {
    super(`Тариф с ID ${id} не найден`);
  }
}

export class TariffNameAlreadyExistsException extends ConflictException {
  constructor(name: string) {
    super(`Тариф с названием "${name}" уже существует`);
  }
}

export class TariffHasActiveSubscriptionsException extends BadRequestException {
  constructor(tariffId: string) {
    super(`Нельзя удалить тариф ${tariffId} - есть активные подписки`);
  }
}

// ====== CUSTOMERS EXCEPTIONS ======
export class CustomerNotFoundException extends NotFoundException {
  constructor(id: string) {
    super(`Клиент с ID ${id} не найден`);
  }
}

export class CustomerEmailAlreadyExistsException extends ConflictException {
  constructor(email: string, companyId: string) {
    super(`Клиент с email ${email} уже существует в компании ${companyId}`);
  }
}

// ====== VEHICLES EXCEPTIONS ======
export class VehicleNotFoundException extends NotFoundException {
  constructor(id: string) {
    super(`Автомобиль с ID ${id} не найден`);
  }
}

export class VehicleVinAlreadyExistsException extends ConflictException {
  constructor(vin: string) {
    super(`Автомобиль с VIN ${vin} уже зарегистрирован в системе`);
  }
}

export class VehicleLicensePlateAlreadyExistsException extends ConflictException {
  constructor(licensePlate: string, companyId: string) {
    super(`Автомобиль с номером ${licensePlate} уже зарегистрирован в компании`);
  }
}

// ====== SERVICE HISTORY EXCEPTIONS ======
export class ServiceHistoryNotFoundException extends NotFoundException {
  constructor(id: string) {
    super(`Запись истории обслуживания с ID ${id} не найдена`);
  }
}

// ====== VEHICLE CATALOGS EXCEPTIONS ======
export class VehicleBrandNotFoundException extends NotFoundException {
  constructor(id: string) {
    super(`Бренд автомобиля с ID ${id} не найден`);
  }
}

export class VehicleModelNotFoundException extends NotFoundException {
  constructor(id: string) {
    super(`Модель автомобиля с ID ${id} не найдена`);
  }
}

export class VehicleTypeNotFoundException extends NotFoundException {
  constructor(id: string) {
    super(`Тип автомобиля с ID ${id} не найден`);
  }
}

// ====== LIMITS EXCEPTIONS ======
export class CompanyLimitExceededException extends ForbiddenException {
  constructor(resourceType: string, currentCount: number, maxAllowed: number) {
    super(
      `Превышен лимит для ${resourceType}. ` +
      `Текущее количество: ${currentCount}, максимально разрешено: ${maxAllowed}`
    );
  }
}

export class SubscriptionRequiredException extends ForbiddenException {
  constructor(action: string) {
    super(`Для выполнения действия "${action}" требуется активная подписка`);
  }
}

// ====== GENERAL EXCEPTIONS ======
export class ResourceOwnershipException extends ForbiddenException {
  constructor(resourceType: string, resourceId: string) {
    super(`Нет доступа к ресурсу ${resourceType} с ID ${resourceId}`);
  }
}

export class ValidationDataException extends BadRequestException {
  constructor(field: string, reason: string) {
    super(`Ошибка валидации поля "${field}": ${reason}`);
  }
}

// ====== SERVICES EXCEPTIONS ======
export class ServiceNotFoundException extends NotFoundException {
  constructor(id: string) {
    super(`Услуга с ID ${id} не найдена`);
  }
}

export class ServiceCategoryNotFoundException extends NotFoundException {
  constructor(id: string) {
    super(`Категория услуг с ID ${id} не найдена`);
  }
}

export class ServiceCategoryInUseException extends BadRequestException {
  constructor(categoryId: string) {
    super(`Категория ${categoryId} используется услугами и не может быть удалена`);
  }
}

export class ServiceNotAvailableException extends BadRequestException {
  constructor(serviceId: string) {
    super(`Услуга ${serviceId} недоступна для заказа`);
  }
}

// ====== PAYMENT METHODS EXCEPTIONS ======
export class PaymentMethodNotFoundException extends NotFoundException {
  constructor(id: string) {
    super(`Способ оплаты с ID ${id} не найден`);
  }
}

export class PaymentMethodInUseException extends BadRequestException {
  constructor(paymentMethodId: string) {
    super(`Способ оплаты ${paymentMethodId} используется и не может быть удален`);
  }
}

// ====== WORK SCHEDULES EXCEPTIONS ======
export class WorkScheduleNotFoundException extends NotFoundException {
  constructor(id: string) {
    super(`Расписание работы с ID ${id} не найдено`);
  }
}

export class WorkScheduleConflictException extends BadRequestException {
  constructor(userId: string, dayOfWeek: number) {
    super(`Конфликт расписания: у пользователя ${userId} уже есть расписание на ${dayOfWeek} день недели`);
  }
}

// ====== APPOINTMENTS EXCEPTIONS ======
export class AppointmentNotFoundException extends NotFoundException {
  constructor(id: string) {
    super(`Запись с ID ${id} не найдена`);
  }
}

export class AppointmentConflictException extends BadRequestException {
  constructor(startTime: string, endTime: string) {
    super(`Конфликт записи: временной слот ${startTime}-${endTime} уже занят`);
  }
}

export class InsufficientCapacityException extends BadRequestException {
  constructor(serviceId: string, requestedTime: string) {
    super(`Недостаточно мощностей для услуги ${serviceId} на время ${requestedTime}`);
  }
}

// ====== ORDERS EXCEPTIONS ======
export class OrderNotFoundException extends NotFoundException {
  constructor(id: string) {
    super(`Заказ с ID ${id} не найден`);
  }
}

export class OrderStatusTransitionException extends BadRequestException {
  constructor(from: string, to: string) {
    super(`Невозможно изменить статус заказа с "${from}" на "${to}"`);
  }
}

// ====== INVOICES & PAYMENTS EXCEPTIONS ======
export class InvoiceNotFoundException extends NotFoundException {
  constructor(id: string) {
    super(`Счет с ID ${id} не найден`);
  }
}

export class InvoiceAlreadyPaidException extends BadRequestException {
  constructor(invoiceNumber: string) {
    super(`Счет ${invoiceNumber} уже оплачен`);
  }
}

export class PaymentNotFoundException extends NotFoundException {
  constructor(id: string) {
    super(`Платеж с ID ${id} не найден`);
  }
}

export class PaymentProcessingException extends BadRequestException {
  constructor(reason: string) {
    super(`Ошибка обработки платежа: ${reason}`);
  }
}

// ====== ORDER SERVICES EXCEPTIONS ======
export class OrderServiceNotFoundException extends NotFoundException {
  constructor(id: string) {
    super(`Услуга в заказе с ID ${id} не найдена`);
  }
}

export class OrderServiceStatusTransitionException extends BadRequestException {
  constructor(from: string, to: string) {
    super(`Невозможно изменить статус услуги с "${from}" на "${to}"`);
  }
}

// ====== ORDER PARTS EXCEPTIONS ======
export class OrderPartNotFoundException extends NotFoundException {
  constructor(id: string) {
    super(`Запчасть в заказе с ID ${id} не найдена`);
  }
}

// ====== INVENTORY EXCEPTIONS ======
export class InventoryNotFoundException extends NotFoundException {
  constructor(id: string) {
    super(`Позиция склада с ID ${id} не найдена`);
  }
}

export class InsufficientStockException extends BadRequestException {
  constructor(partId: string, available: number, requested: number) {
    super(`Недостаточно запчастей на складе. Запчасть ${partId}: доступно ${available}, требуется ${requested}`);
  }
}

export class StockMovementNotFoundException extends NotFoundException {
  constructor(id: string) {
    super(`Движение по складу с ID ${id} не найдено`);
  }
}

export class ReservationNotFoundException extends NotFoundException {
  constructor(id: string) {
    super(`Резервирование с ID ${id} не найдено`);
  }
}

export class ReservationExpiredException extends BadRequestException {
  constructor(reservationId: string) {
    super(`Резервирование ${reservationId} истекло`);
  }
}

// ====== PARTS EXCEPTIONS ======
export class PartNotFoundException extends NotFoundException {
  constructor(id: string) {
    super(`Запчасть с ID ${id} не найдена`);
  }
}

export class PartCategoryNotFoundException extends NotFoundException {
  constructor(id: string) {
    super(`Категория запчастей с ID ${id} не найдена`);
  }
}

// ====== GENERAL EXCEPTIONS ======
export class ResourceNotFoundException extends NotFoundException {
  constructor(resourceType: string, id: string) {
    super(`Ресурс ${resourceType} с ID ${id} не найден`);
  }
}

// ====== SUPPLIERS EXCEPTIONS ======
export class SupplierNotFoundException extends NotFoundException {
  constructor(id: string) {
    super(`Поставщик с ID ${id} не найден`);
  }
}

export class SupplierEmailAlreadyExistsException extends ConflictException {
  constructor(email: string, companyId: string) {
    super(`Поставщик с email ${email} уже существует в компании ${companyId}`);
  }
}

export class SupplierTaxNumberAlreadyExistsException extends ConflictException {
  constructor(taxNumber: string, companyId: string) {
    super(`Поставщик с налоговым номером ${taxNumber} уже существует в компании ${companyId}`);
  }
}