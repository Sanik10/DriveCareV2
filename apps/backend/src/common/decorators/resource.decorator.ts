import { SetMetadata } from '@nestjs/common';

export const RESOURCE_TYPE_KEY = 'resourceType';
export const RESOURCE_PARAM_KEY = 'resourceParam';

/**
 * Декоратор для указания типа ресурса и параметра для проверки принадлежности
 * @param type - тип ресурса (company, subscription, etc.)
 * @param param - название параметра в URL (по умолчанию 'id')
 */
export const ResourceOwnership = (type: string, param: string = 'id') => {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    SetMetadata(RESOURCE_TYPE_KEY, type)(target, propertyKey, descriptor);
    SetMetadata(RESOURCE_PARAM_KEY, param)(target, propertyKey, descriptor);
  };
};

/**
 * Декоратор для компаний - проверяет, что пользователь принадлежит к компании
 * @param param - название параметра (по умолчанию 'id')
 */
export const CompanyResource = (param: string = 'id') => ResourceOwnership('company', param);

/**
 * Декоратор для подписок компании - проверяет доступ к подпискам компании
 * Используется для endpoints вида /subscriptions/company/:companyId
 */
export const CompanySubscriptions = () => ResourceOwnership('company-subscriptions', 'companyId');

/**
 * Декоратор для конкретной подписки - проверяет принадлежность подписки
 */
export const SubscriptionResource = () => ResourceOwnership('subscription', 'id');