import { Subscription, Tariff } from '../../../database/entities';
import {
  CreateSubscriptionData,
  UpdateSubscriptionData,
  SubscriptionFilter,
  TariffLimits,
  LimitCheckResult,
  SubscriptionStatus,
} from '../types/subscriptions.types';

export interface ISubscriptionsDataService {
  create(data: CreateSubscriptionData): Promise<Subscription>;
  findById(id: string): Promise<Subscription | null>;
  findByCompany(
    companyId: string,
    page?: number,
    limit?: number,
    status?: SubscriptionStatus,
  ): Promise<[Subscription[], number]>;
  findActiveByCompany(companyId: string): Promise<Subscription | null>;
  findExpiredSubscriptions(): Promise<Subscription[]>;
  update(id: string, data: UpdateSubscriptionData): Promise<Subscription>;
  delete(id: string): Promise<void>;
  deactivateCompanySubscriptions(companyId: string): Promise<number>;
}

export interface ISubscriptionsBusinessService {
  createSubscription(data: CreateSubscriptionData, idempotencyKey?: string): Promise<Subscription>;
  updateSubscription(id: string, data: UpdateSubscriptionData): Promise<Subscription>;
  cancelSubscription(id: string): Promise<Subscription>;
  processExpiredSubscriptions(): Promise<number>;
  autoDeactivatePreviousSubscriptions(companyId: string): Promise<void>;
}

export interface ISubscriptionsValidationService {
  validateCreateData(data: CreateSubscriptionData): Promise<void>;
  validateUpdateData(id: string, data: UpdateSubscriptionData): Promise<void>;
  validateSubscriptionExists(id: string): Promise<Subscription>;
  validateCompanyExists(companyId: string): Promise<void>;
  validateTariffExists(tariffId: string): Promise<Tariff>;
}

export interface ISubscriptionLimitsService {
  checkUserLimit(companyId: string, currentCount: number, increment?: number): Promise<LimitCheckResult>;
  checkCustomerLimit(companyId: string, currentCount: number, increment?: number): Promise<LimitCheckResult>;
  checkVehicleLimit(companyId: string, currentCount: number, increment?: number): Promise<LimitCheckResult>;
  checkOrderLimit(companyId: string, currentCount: number, increment?: number): Promise<LimitCheckResult>;
  getTariffLimits(companyId: string): Promise<TariffLimits | null>;
  validateLimit(
    companyId: string,
    limitType: keyof TariffLimits,
    currentCount: number,
    increment?: number,
  ): Promise<boolean>;
}
