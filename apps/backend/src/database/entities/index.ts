// path: apps/backend/src/database/entities/index.ts
// Base entities
export { User } from './user.entity';
export { Role } from './role.entity';
export { UserSession } from './user-session.entity';
export { AuditLog } from './audit-log.entity';
export { Permission } from './permission.entity';

// Company entities
export { Company } from './company.entity';
export { Subscription, SubscriptionStatus } from './subscription.entity';
export { Tariff } from './tariff.entity';

// Customer entities
export { Customer, CustomerType } from './customer.entity';
export { Vehicle, EngineType } from './vehicle.entity';
export { VehicleBrand } from './vehicle-brand.entity';
export { VehicleModel } from './vehicle-model.entity';
export { VehicleType } from './vehicle-type.entity';
export { VehicleServiceHistory } from './service-history.entity';

// Order entities
export { Order } from './order.entity';
export { OrderService } from './order-service.entity';
export { OrderPart } from './order-part.entity';
export { Appointment, AppointmentStatus, AppointmentPriority } from './appointment.entity';
export { WorkSchedule } from './work-schedule.entity';
export { ScheduleException, ExceptionType, ExceptionStatus } from './schedule-exception.entity';

// Service entities
export { Service } from './service.entity';
export { ServiceCategory } from './service-category.entity';

// Inventory entities
export { Part } from './part.entity';
export { PartCategory } from './part-category.entity';
export { Inventory } from './inventory.entity';
export { InventoryAlert } from './inventory-alert.entity';
export { StockMovement } from './stock-movement.entity';
export { Supplier } from './supplier.entity';
export { PartReservation } from './part-reservation.entity';

// Payment entities
export { Payment } from './payment.entity';
export { PaymentMethod } from './payment-method.entity';
export { Invoice } from './invoice.entity';
