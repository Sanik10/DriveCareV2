// path: apps/backend/src/modules/services/types/services.types.ts
import { RequestWithUser } from '../../auth/interfaces/request-with-user.interface';

export interface ServicesFilter {
  companyId?: string;
  categoryId?: string;
  isActive?: boolean;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  minDuration?: number;
  maxDuration?: number;
  sortBy?: 'name' | 'price' | 'durationMinutes' | 'createdAt' | 'updatedAt';
  sortOrder?: 'ASC' | 'DESC';
  page?: number;
  limit?: number;
  offset?: number;
}

export interface ServiceWithCategory {
  id: string;
  companyId: string;
  categoryId: string;
  categoryName: string;
  name: string;
  description?: string;
  price: number;
  durationMinutes: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ServiceStats {
  total: number;
  active: number;
  inactive: number;
  avgPrice: number;
  avgDuration: number;
  byCategory: {
    categoryId: string;
    categoryName: string;
    count: number;
  }[];
}

export interface BulkUpdateResult {
  updated: number;
  failed: number;
  errors: string[];
  message: string;
}

export type UserWithCompany = RequestWithUser['user'];

// 🔥 Service Packages (для будущих улучшений)
export interface ServicePackage {
  id: string;
  companyId: string;
  name: string;
  description?: string;
  serviceIds: string[];
  discountPercent: number;
  totalPrice: number;
  discountedPrice: number;
  estimatedDuration: number;
  isActive: boolean;
}

// 🔥 Dynamic Pricing (для будущих улучшений)
export interface PricingRule {
  id: string;
  serviceId: string;
  name: string;
  conditions: {
    customerType?: 'new' | 'regular' | 'vip';
    timeOfDay?: 'morning' | 'afternoon' | 'evening';
    dayOfWeek?: number[];
    season?: 'spring' | 'summer' | 'autumn' | 'winter';
  };
  modifier: number; // Коэффициент цены (0.8 = -20%, 1.2 = +20%)
  isActive: boolean;
}
