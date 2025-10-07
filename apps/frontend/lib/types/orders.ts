// path: apps/frontend/lib/types/orders.ts

// Enums
export type OrderStatus = 'new' | 'in_progress' | 'awaiting_parts' | 'completed' | 'canceled';
export type OrderServiceStatus = 'planned' | 'in_progress' | 'completed';

// Shared
export interface UserMini {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  specialization?: string;
}

export interface CustomerInfo {
  id: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  email: string;
  phone: string;
  type: 'individual' | 'company';
}

export interface VehicleBrandInfo {
  id: string;
  name: string;
}

export interface VehicleModelInfo {
  id: string;
  name: string;
  brand?: VehicleBrandInfo;
}

export interface VehicleInfo {
  id: string;
  vin?: string;
  licensePlate?: string;
  year?: number;
  color?: string;
  mileage?: number;
  model?: VehicleModelInfo;
}

// Services
export interface ServiceInfo {
  id: string;
  name: string;
  description?: string;
  // В бэкенд DTO базовая цена = price
  price?: number;
  // Поддержим совместимость, если где-то используется basePrice
  basePrice?: number;
  durationMinutes: number;
  category?: {
    id: string;
    name: string;
  };
}

export interface MechanicInfo {
  id: string;
  firstName: string;
  lastName: string;
  specialization?: string;
}

export interface OrderServiceResponse {
  id: string;
  orderId: string;
  serviceId: string;
  price: number;
  quantity: number;
  discountPercent: number;
  totalAmount: number;
  status: OrderServiceStatus;
  mechanicId?: string;
  startTime?: string;
  endTime?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  // linked
  service?: ServiceInfo;
  mechanic?: MechanicInfo;
  // computed (делаем опциональными, т.к. бэкенд может их не отдавать)
  displayStatus?: string;
  isInProgress?: boolean;
  isCompleted?: boolean;
  duration?: number;
  priceWithDiscount?: number;
  discountAmount?: number;
}

export interface OrderServicesListResponse {
  orderId: string;
  services: OrderServiceResponse[];
  totalServices: number;
  totalAmount: number;
  statusStats?: {
    planned: number;
    inProgress: number;
    completed: number;
  };
  completionPercentage?: number;
  estimatedTotalDuration?: number;
}

// Parts
export interface PartInfo {
  id: string;
  name: string;
  partNumber?: string;
  brand?: string;
  description?: string;
}

export interface OrderPartResponse {
  id: string;
  orderId: string;
  partId: string;
  price: number;
  quantity: number;
  discountPercent: number;
  totalAmount: number;
  isCustomerProvided: boolean;
  createdAt: string;
  updatedAt: string;
  // linked
  part?: PartInfo;
  // computed (делаем опциональными для соответствия DTO)
  subtotal?: number;
  discountAmount?: number;
  unitPriceWithDiscount?: number;
  isOurPart?: boolean;
  categoryName?: string;
  displayStatus?: string;
  costPrice?: number;
  margin?: number;
  profitAmount?: number;
}

export interface OrderPartsListResponse {
  orderId: string;
  parts: OrderPartResponse[];
  totalParts: number;
  totalAmount: number;
  customerProvidedCount: number;
  ourPartsCount: number;
  categoryStats?: Record<string, number>;
  needsInventoryCheck?: boolean;
}

// Order
export interface OrderResponse {
  id: string;
  companyId: string;
  customerId: string;
  vehicleId: string;
  orderNumber: string;
  status: OrderStatus;
  createdBy: string;
  assignedTo?: string;
  description?: string;
  customerComplaints?: string;
  diagnosticResults?: string;
  totalAmount: number;
  discountAmount: number;
  taxAmount: number;
  finalAmount: number;
  mileage?: number;
  estimatedCompletionTime?: string;
  actualCompletionTime?: string;
  createdAt: string;
  updatedAt: string;

  // linked
  customer?: CustomerInfo;
  vehicle?: VehicleInfo;
  createdByUser?: UserMini;
  assignedToUser?: UserMini;
  orderServices?: OrderServiceResponse[];
  orderParts?: OrderPartResponse[];

  // computed
  displayStatus: string;
  isOverdue: boolean;
  progressPercentage: number;
  estimatedDuration?: number;
}

export interface PaginatedOrdersResponse {
  items: OrderResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Requests
export interface CreateOrderRequest {
  companyId?: string;
  customerId: string;
  vehicleId: string;
  status?: OrderStatus;
  createdBy?: string;
  assignedTo?: string;
  description?: string;
  customerComplaints?: string;
  mileage?: number;
  estimatedCompletionTime?: string;
  discountAmount?: number;
}

export interface UpdateOrderRequest {
  status?: OrderStatus;
  assignedTo?: string;
  description?: string;
  customerComplaints?: string;
  diagnosticResults?: string;
  mileage?: number;
  estimatedCompletionTime?: string;
  actualCompletionTime?: string;
  totalAmount?: number;
  discountAmount?: number;
  taxAmount?: number;
  finalAmount?: number;
  updatedBy?: string;
}

export interface OrdersQuery {
  customerId?: string;
  vehicleId?: string;
  status?: OrderStatus;
  assignedTo?: string;
  search?: string;
  page?: number;
  limit?: number;
  dateFrom?: string;
  dateTo?: string;
  sortField?: 'orderNumber' | 'status' | 'totalAmount' | 'finalAmount' | 'createdAt' | 'estimatedCompletionTime' | 'customerName';
  sortOrder?: 'asc' | 'desc';
}

// Service requests
export interface AddServiceToOrderRequest {
  serviceId: string;
  quantity?: number;
  customPrice?: number;
  discountPercent?: number;
  mechanicId?: string;
  notes?: string;
}

export interface UpdateOrderServiceRequest {
  quantity?: number;
  price?: number;
  discountPercent?: number;
  mechanicId?: string;
  notes?: string;
}

// Part requests
export interface AddPartToOrderRequest {
  partId: string;
  quantity?: number;
  customPrice?: number;
  discountPercent?: number;
  isCustomerProvided?: boolean;
}

export interface UpdateOrderPartRequest {
  quantity?: number;
  price?: number;
  discountPercent?: number;
  isCustomerProvided?: boolean;
}
