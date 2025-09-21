// path: apps/frontend/lib/types/customers.ts
export type CustomerStatus = 'active' | 'inactive' | 'deleted' | string;
export type CustomerType = 'individual' | 'company';

export interface CustomerResponse {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  companyName?: string | null;
  phone?: string | null;
  email?: string | null;
  status?: CustomerStatus;
  createdAt: string;
  updatedAt: string;
  // опциональные поля с бэка
  vehiclesCount?: number;
  displayName?: string;
}

export interface PaginatedCustomersResponse {
  items: CustomerResponse[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface CustomersQuery {
  search?: string;
  status?: CustomerStatus;
  page?: number;
  limit?: number;
}

export interface CreateCustomerRequest {
  type?: CustomerType; // default: 'individual'
  firstName?: string;
  lastName?: string;
  companyName?: string;
  phone: string; // ОБЯЗАТЕЛЬНО (по бэку)
  email: string; // ОБЯЗАТЕЛЬНО (по бэку)
  // ниже — опциональные поля, есть в DTO
  address?: string;
  source?: string;
  loyaltyPoints?: number;
  notes?: string;
  isActive?: boolean;
  marketingConsent?: boolean;
  pdpConsentVersion?: string;
}

export type UpdateCustomerRequest = Partial<CreateCustomerRequest>;

/**
 * Timeline types (для /customers/:id/timeline и UI компонента)
 */
export type TimelineEventType =
  | 'order'
  | 'vehicle'
  | 'profile'
  | 'call'
  | 'email'
  | 'note'
  | 'payment'
  | 'invoice'
  | 'appointment';

export type TimelineEventStatus = 'success' | 'warning' | 'error' | 'info';

export interface TimelineEvent {
  id: string;
  type: TimelineEventType;
  title: string;
  description?: string;
  date: string; // ISO
  status?: TimelineEventStatus;
  amount?: number;
  relatedId?: string; // ID связанной сущности
  metadata?: Record<string, unknown>;
}

export interface CustomerTimelineResponse {
  events: TimelineEvent[];
  totalEvents: number;
  nextCursor?: string;
}
