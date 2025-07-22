import { Tariff } from '../../../database/entities';
import { 
  CreateTariffData, 
  UpdateTariffData, 
  TariffFilter, 
  TariffFeatures 
} from '../types/tariffs.types';

export interface ITariffsDataService {
  create(data: CreateTariffData): Promise<Tariff>;
  findAll(onlyActive?: boolean): Promise<Tariff[]>;
  findById(id: string): Promise<Tariff | null>;
  findByName(name: string): Promise<Tariff | null>;
  findWithFilters(filter: TariffFilter): Promise<[Tariff[], number]>;
  update(id: string, data: UpdateTariffData): Promise<Tariff>;
  delete(id: string): Promise<void>;
  setActive(id: string, isActive: boolean): Promise<Tariff>;
  getPopularTariffs(limit?: number): Promise<Tariff[]>;
}

export interface ITariffsBusinessService {
  createTariff(data: CreateTariffData): Promise<Tariff>;
  updateTariff(id: string, data: UpdateTariffData): Promise<Tariff>;
  deleteTariff(id: string): Promise<void>;
  toggleTariffStatus(id: string, isActive: boolean): Promise<Tariff>;
  calculateYearlyDiscount(monthlyPrice: number, yearlyPrice: number): number;
  validatePricing(monthlyPrice: number, yearlyPrice: number): void;
  processFeatures(features?: TariffFeatures): TariffFeatures;
}

export interface ITariffsValidationService {
  validateCreateData(data: CreateTariffData): Promise<void>;
  validateUpdateData(id: string, data: UpdateTariffData): Promise<void>;
  validateTariffExists(id: string): Promise<Tariff>;
  validateNameUniqueness(name: string, excludeId?: string): Promise<void>;
  validatePrices(monthlyPrice?: number, yearlyPrice?: number): void;
  validateLimits(limits: { maxUsers?: number; maxCustomers?: number; maxVehicles?: number; maxOrders?: number }): void;
}
