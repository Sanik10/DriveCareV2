import { VehicleBrand, VehicleModel, VehicleType } from '../../../database/entities';
import { 
  BrandFilter, 
  ModelFilter, 
  TypeFilter,
  CreateBrandData,
  UpdateBrandData,
  CreateModelData,
  UpdateModelData,
  CreateTypeData,
  UpdateTypeData
} from '../types/catalogue.types';

// ====== BRANDS INTERFACES ======
export interface IBrandsDataService {
  create(data: CreateBrandData): Promise<VehicleBrand>;
  findAll(): Promise<VehicleBrand[]>;
  findById(id: string): Promise<VehicleBrand | null>;
  findByName(name: string): Promise<VehicleBrand | null>;
  findWithFilters(filter: BrandFilter): Promise<VehicleBrand[]>;
  update(id: string, data: UpdateBrandData): Promise<VehicleBrand>;
  softDelete(id: string): Promise<void>;
  hardDelete(id: string): Promise<void>;
  setActive(id: string, isActive: boolean): Promise<VehicleBrand>;
  countModels(brandId: string): Promise<number>;
}

// ====== MODELS INTERFACES ======
export interface IModelsDataService {
  create(data: CreateModelData): Promise<VehicleModel>;
  findAll(): Promise<VehicleModel[]>;
  findById(id: string): Promise<VehicleModel | null>;
  findByNameAndBrand(name: string, brandId: string): Promise<VehicleModel | null>;
  findWithFilters(filter: ModelFilter): Promise<VehicleModel[]>;
  update(id: string, data: UpdateModelData): Promise<VehicleModel>;
  softDelete(id: string): Promise<void>;
  hardDelete(id: string): Promise<void>;
  setActive(id: string, isActive: boolean): Promise<VehicleModel>;
  countVehicles(modelId: string): Promise<number>;
  findByBrand(brandId: string): Promise<VehicleModel[]>;
}

// ====== TYPES INTERFACES ======
export interface ITypesDataService {
  create(data: CreateTypeData): Promise<VehicleType>;
  findAll(): Promise<VehicleType[]>;
  findById(id: string): Promise<VehicleType | null>;
  findByName(name: string): Promise<VehicleType | null>;
  findWithFilters(filter: TypeFilter): Promise<VehicleType[]>;
  update(id: string, data: UpdateTypeData): Promise<VehicleType>;
  softDelete(id: string): Promise<void>;
  hardDelete(id: string): Promise<void>;
  setActive(id: string, isActive: boolean): Promise<VehicleType>;
  countVehicles(typeId: string): Promise<number>;
}

// ====== BUSINESS INTERFACES ======
export interface ICatalogueBusinessService {
  createBrand(data: CreateBrandData): Promise<VehicleBrand>;
  updateBrand(id: string, data: UpdateBrandData): Promise<VehicleBrand>;
  deleteBrand(id: string): Promise<void>;
  
  createModel(data: CreateModelData): Promise<VehicleModel>;
  updateModel(id: string, data: UpdateModelData): Promise<VehicleModel>;
  deleteModel(id: string): Promise<void>;
  
  createType(data: CreateTypeData): Promise<VehicleType>;
  updateType(id: string, data: UpdateTypeData): Promise<VehicleType>;
  deleteType(id: string): Promise<void>;
}

// ====== VALIDATION INTERFACES ======
export interface ICatalogueValidationService {
  // Brands validation
  validateBrandExists(id: string): Promise<VehicleBrand>;
  validateBrandNameUniqueness(name: string, excludeId?: string): Promise<void>;
  validateBrandCanBeDeleted(id: string): Promise<void>;
  validateBrandData(data: Partial<CreateBrandData | UpdateBrandData>): void;
  
  // Models validation
  validateModelExists(id: string): Promise<VehicleModel>;
  validateModelNameUniqueness(name: string, brandId: string, excludeId?: string): Promise<void>;
  validateModelCanBeDeleted(id: string): Promise<void>;
  validateModelData(data: Partial<CreateModelData | UpdateModelData>): void;
  
  // Types validation
  validateTypeExists(id: string): Promise<VehicleType>;
  validateTypeNameUniqueness(name: string, excludeId?: string): Promise<void>;
  validateTypeCanBeDeleted(id: string): Promise<void>;
  validateTypeData(data: Partial<CreateTypeData | UpdateTypeData>): void;
}

// ====== MAPPER INTERFACES ======
export interface ICatalogueMapperService {
  // Brands mapping
  mapBrandToResponseDto(brand: VehicleBrand): any;
  mapBrandsArrayToResponseDto(brands: VehicleBrand[]): any[];
  
  // Models mapping
  mapModelToResponseDto(model: VehicleModel): any;
  mapModelsArrayToResponseDto(models: VehicleModel[]): any[];
  
  // Types mapping
  mapTypeToResponseDto(type: VehicleType): any;
  mapTypesArrayToResponseDto(types: VehicleType[]): any[];
  
  // Utility mapping
  mapBrandToSelectOption(brand: VehicleBrand): { value: string; label: string; disabled?: boolean };
  mapModelToSelectOption(model: VehicleModel): { value: string; label: string; disabled?: boolean };
  mapTypeToSelectOption(type: VehicleType): { value: string; label: string; disabled?: boolean };
}
