// path: apps/backend/src/common/decorators/resource.decorator.ts
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
export const VehicleResource = (param: string = 'id') => ResourceOwnership('vehicle', param);
export const ServiceHistoryResource = (param: string = 'id') => ResourceOwnership('service-history', param);
export const VehicleBrandResource = (param: string = 'id') => ResourceOwnership('vehicle-brand', param);
export const VehicleModelResource = (param: string = 'id') => ResourceOwnership('vehicle-model', param);
export const VehicleTypeResource = (param: string = 'id') => ResourceOwnership('vehicle-type', param);
export const ServiceResource = (param: string = 'id') => ResourceOwnership('service', param);
export const ServiceCategoryResource = (param: string = 'id') => ResourceOwnership('service-category', param);
export const PaymentMethodResource = (param: string = 'id') => ResourceOwnership('payment-method', param);
export const WorkScheduleResource = (param: string = 'id') => ResourceOwnership('work-schedule', param);
export const AppointmentResource = (param: string = 'id') => ResourceOwnership('appointment', param);
export const OrderResource = (param: string = 'id') => ResourceOwnership('order', param);
export const InvoiceResource = (param: string = 'id') => ResourceOwnership('invoice', param);
export const PaymentResource = (param: string = 'id') => ResourceOwnership('payment', param);
export const SupplierResource = (param: string = 'id') => ResourceOwnership('supplier', param);
export const InventoryResource = (param: string = 'id') => ResourceOwnership('inventory', param);
export const PartResource = (param: string = 'id') => ResourceOwnership('part', param);
export const StockMovementResource = (param: string = 'id') => ResourceOwnership('stock-movement', param);
export const InventoryAlertResource = (param: string = 'id') => ResourceOwnership('inventory-alert', param);
