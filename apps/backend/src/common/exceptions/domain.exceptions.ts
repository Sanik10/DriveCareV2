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
