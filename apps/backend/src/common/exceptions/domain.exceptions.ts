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
