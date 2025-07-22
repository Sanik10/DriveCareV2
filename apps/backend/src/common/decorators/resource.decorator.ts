import { SetMetadata } from '@nestjs/common';

export const RESOURCE_TYPE_KEY = 'resourceType';
export const RESOURCE_PARAM_KEY = 'resourceParam';

export const ResourceOwnership = (type: string, param: string = 'id') => {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    SetMetadata(RESOURCE_TYPE_KEY, type)(target, propertyKey, descriptor);
    SetMetadata(RESOURCE_PARAM_KEY, param)(target, propertyKey, descriptor);
  };
};

export const CompanyResource = (param: string = 'id') => ResourceOwnership('company', param);

export const CompanySubscriptions = () => ResourceOwnership('company-subscriptions', 'companyId');

export const SubscriptionResource = () => ResourceOwnership('subscription', 'id');

export const CustomerResource = (param: string = 'id') => ResourceOwnership('customer', param);

// 🔥 ДОБАВЛЕНО: Vehicle decorators
export const VehicleResource = (param: string = 'id') => ResourceOwnership('vehicle', param);

export const ServiceHistoryResource = (param: string = 'id') => ResourceOwnership('service-history', param);

export const VehicleBrandResource = (param: string = 'id') => ResourceOwnership('vehicle-brand', param);

export const VehicleModelResource = (param: string = 'id') => ResourceOwnership('vehicle-model', param);

export const VehicleTypeResource = (param: string = 'id') => ResourceOwnership('vehicle-type', param);