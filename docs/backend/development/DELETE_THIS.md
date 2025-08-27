# 🚨 **КРИТИЧЕСКИЕ ПРОБЛЕМЫ ОБНАРУЖЕНЫ!**

Изучил старый код - там **катастрофические дыры безопасности**! Создаю **полностью безопасную Enterprise версию**.

## 💀 **КРИТИЧНЫЕ ПРОБЛЕМЫ СТАРОГО КОДА:**
- ❌ `findAll()` возвращает **ВСЮ историю ВСЕХ компаний**! 
- ❌ Нет ownership проверок (любой может редактировать чужие записи)
- ❌ Entity без `companyId` (но уже исправлена в DriveCare 2.0)

# 🚀 **СОЗДАЕМ БЕЗОПАСНУЮ ENTERPRISE ВЕРСИЮ (6 файлов)**

## 📋 **Создай файл:** `src/modules/service-history/constants/service-history.constants.ts`

```typescript
export const SERVICE_HISTORY_CONSTANTS = {
  DEFAULTS: {
    PAGE_SIZE: 20,
    MAX_ITEMS: 100,
    DEFAULT_SORT_FIELD: 'date',
    DEFAULT_SORT_ORDER: 'desc',
  },

  VALIDATION: {
    MIN_DESCRIPTION_LENGTH: 10,
    MAX_DESCRIPTION_LENGTH: 2000,
    MAX_NOTES_LENGTH: 1000,
    MIN_MILEAGE: 0,
    MAX_MILEAGE: 9999999,
    MAX_DAYS_IN_PAST: 365 * 5, // 5 лет назад
    MAX_DAYS_IN_FUTURE: 365 * 2, // 2 года вперед
  },

  SEARCH: {
    MIN_SEARCH_LENGTH: 2,
    SEARCHABLE_FIELDS: ['description', 'notes', 'orderId'],
  },

  FEATURES: {
    AUTO_UPDATE_VEHICLE_DATES: true,
    AUDIT_LOGGING_ENABLED: true,
    ADVANCED_FILTERING: true,
  },

  LOG_MESSAGES: {
    CREATED: 'Создана новая запись истории обслуживания',
    UPDATED: 'Обновлена запись истории обслуживания',
    DELETED: 'Удалена запись истории обслуживания',
    NOT_FOUND: 'Запись истории обслуживания не найдена',
    ACCESS_DENIED: 'Отказано в доступе к записи истории обслуживания',
    VEHICLE_UPDATED: 'Обновлены даты ТО автомобиля',
  },

  BUSINESS_RULES: {
    AUTO_UPDATE_VEHICLE_SERVICE_DATES: true,
    REQUIRE_MILEAGE_FOR_COMPLETION: false,
    VALIDATE_CHRONOLOGICAL_ORDER: true,
    PREVENT_FUTURE_SERVICE_DATES: false,
  },
} as const;

export const SERVICE_HISTORY_SORT_FIELDS = [
  'date',
  'mileage', 
  'createdAt',
  'nextServiceDate',
] as const;

export const SERVICE_HISTORY_DATE_FILTERS = {
  LAST_WEEK: 'last_week',
  LAST_MONTH: 'last_month',
  LAST_3_MONTHS: 'last_3_months',
  LAST_6_MONTHS: 'last_6_months',
  LAST_YEAR: 'last_year',
  CUSTOM: 'custom',
} as const;
```

## 📋 **Создай файл:** `src/modules/service-history/types/service-history.types.ts`

```typescript
export type ServiceHistorySortField = 'date' | 'mileage' | 'createdAt' | 'nextServiceDate';
export type SortOrder = 'asc' | 'desc';

export interface ServiceHistoryFilter {
  search?: string;
  vehicleId?: string;
  companyId?: string;
  customerId?: string;
  orderId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  nextServiceFrom?: Date;
  nextServiceTo?: Date;
  mileageFrom?: number;
  mileageTo?: number;
  hasNextService?: boolean;
  page?: number;
  limit?: number;
  sortField?: ServiceHistorySortField;
  sortOrder?: SortOrder;
  includeDeleted?: boolean;
}

export interface CreateServiceHistoryData {
  vehicleId: string;
  companyId: string; // 🔥 КРИТИЧНО: Добавлено для безопасности
  orderId?: string;
  date: Date;
  mileage?: number;
  description: string;
  nextServiceDate?: Date;
  notes?: string;
}

export interface UpdateServiceHistoryData {
  orderId?: string;
  date?: Date;
  mileage?: number;
  description?: string;
  nextServiceDate?: Date;
  notes?: string;
}

export interface ServiceHistoryStats {
  totalRecords: number;
  averageServiceInterval: number; // В днях
  totalMileageServiced: number;
  upcomingServices: number;
  overdueServices: number;
  lastServiceDate?: Date;
  nextServiceDate?: Date;
  serviceFrequency: {
    thisMonth: number;
    lastMonth: number;
    thisYear: number;
  };
}

export interface ServiceHistoryBasicInfo {
  id: string;
  vehicleId: string;
  vehicleInfo: string;
  date: Date;
  description: string;
  mileage?: number;
  companyId: string;
  isOverdue?: boolean;
  daysUntilNextService?: number;
}

export interface ServiceHistoryWithVehicle extends ServiceHistoryBasicInfo {
  vehicle: {
    id: string;
    licensePlate?: string;
    vin?: string;
    model?: {
      name: string;
      brand?: {
        name: string;
      };
    };
    customer: {
      id: string;
      name: string;
    };
  };
  nextServiceDate?: Date;
  notes?: string;
  orderId?: string;
}

export interface VehicleServiceUpdate {
  vehicleId: string;
  lastServiceDate?: Date;
  nextServiceDate?: Date;
  currentMileage?: number;
}
```

## 📋 **Создай файл:** `src/modules/service-history/interfaces/service-history.interface.ts`

```typescript
import { VehicleServiceHistory } from '../../../database/entities/service-history.entity';
import { 
  CreateServiceHistoryData, 
  UpdateServiceHistoryData, 
  ServiceHistoryFilter,
  ServiceHistoryStats,
  ServiceHistoryBasicInfo,
  ServiceHistoryWithVehicle,
  VehicleServiceUpdate
} from '../types/service-history.types';

export interface IServiceHistoryDataService {
  create(data: CreateServiceHistoryData): Promise<VehicleServiceHistory>;
  findAll(): Promise<VehicleServiceHistory[]>;
  findById(id: string): Promise<VehicleServiceHistory | null>;
  findByVehicle(vehicleId: string): Promise<VehicleServiceHistory[]>;
  findWithFilters(filter: ServiceHistoryFilter): Promise<[VehicleServiceHistory[], number]>;
  update(id: string, data: UpdateServiceHistoryData): Promise<VehicleServiceHistory>;
  softDelete(id: string): Promise<void>;
  hardDelete(id: string): Promise<void>;
  getStats(companyId: string): Promise<ServiceHistoryStats>;
  getVehicleStats(vehicleId: string): Promise<ServiceHistoryStats>;
  countByCompany(companyId: string): Promise<number>;
  countByVehicle(vehicleId: string): Promise<number>;
  findOverdueServices(companyId: string): Promise<VehicleServiceHistory[]>;
  findUpcomingServices(companyId: string, days: number): Promise<VehicleServiceHistory[]>;
  getLastServiceForVehicle(vehicleId: string): Promise<VehicleServiceHistory | null>;
}

export interface IServiceHistoryValidationService {
  validateCreateData(data: CreateServiceHistoryData): Promise<void>;
  validateUpdateData(id: string, data: UpdateServiceHistoryData): Promise<void>;
  validateServiceHistoryExists(id: string): Promise<VehicleServiceHistory>;
  validateServiceHistoryOwnership(historyId: string, userCompanyId: string): Promise<VehicleServiceHistory>;
  validateVehicleOwnership(vehicleId: string, userCompanyId: string): Promise<void>;
  validateServiceDate(date: Date, vehicleId?: string): Promise<void>;
  validateMileageProgression(vehicleId: string, newMileage: number, serviceDate: Date): Promise<void>;
  validateBusinessRules(data: CreateServiceHistoryData | UpdateServiceHistoryData): void;
}

export interface IServiceHistoryBusinessService {
  createServiceHistory(data: CreateServiceHistoryData): Promise<VehicleServiceHistory>;
  updateServiceHistory(id: string, data: UpdateServiceHistoryData): Promise<VehicleServiceHistory>;
  deleteServiceHistory(id: string): Promise<void>;
  completeService(vehicleId: string, serviceData: CreateServiceHistoryData): Promise<VehicleServiceHistory>;
  scheduleNextService(vehicleId: string, nextServiceDate: Date, notes?: string): Promise<void>;
  getServiceHistoryWithDetails(id: string, companyId: string): Promise<ServiceHistoryWithVehicle>;
  generateServiceReport(vehicleId: string, companyId: string): Promise<any>;
  updateVehicleServiceInfo(update: VehicleServiceUpdate): Promise<void>;
  calculateNextServiceDate(vehicleId: string, currentServiceDate: Date, mileage?: number): Promise<Date | null>;
  bulkCreateFromOrder(orderId: string, vehicleIds: string[], serviceData: Partial<CreateServiceHistoryData>): Promise<VehicleServiceHistory[]>;
}

export interface IServiceHistoryMapperService {
  mapToResponseDto(serviceHistory: VehicleServiceHistory): any;
  mapArrayToResponseDto(serviceHistories: VehicleServiceHistory[]): any[];
  mapToBasicInfo(serviceHistory: VehicleServiceHistory): ServiceHistoryBasicInfo;
  mapToWithVehicle(serviceHistory: VehicleServiceHistory): ServiceHistoryWithVehicle;
  mapToSelectOption(serviceHistory: VehicleServiceHistory): { value: string; label: string; date: Date };
  formatServiceDescription(serviceHistory: VehicleServiceHistory): string;
  formatVehicleInfo(serviceHistory: VehicleServiceHistory): string;
}

export interface ServiceHistoryIntegration {
  onServiceCompleted(vehicleId: string, serviceData: any): Promise<void>;
  onServiceScheduled(vehicleId: string, nextServiceDate: Date): Promise<void>;
  getServiceRecommendations(vehicleId: string): Promise<any[]>;
}
```

## 📋 **Создай файл:** `src/modules/service-history/dto/request/create-service-history.dto.ts`

```typescript
import { 
  IsString, 
  IsUUID, 
  IsOptional, 
  IsInt, 
  Min,
  Max,
  IsDateString,
  MinLength,
  MaxLength,
  IsNotEmpty
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SERVICE_HISTORY_CONSTANTS } from '../../constants/service-history.constants';

export class CreateServiceHistoryDto {
  @ApiProperty({ 
    example: '123e4567-e89b-12d3-a456-426614174000', 
    description: 'ID автомобиля для которого создается запись'
  })
  @IsUUID(4, { message: 'ID автомобиля должен быть валидным UUID' })
  vehicleId: string;

  @ApiPropertyOptional({ 
    example: '123e4567-e89b-12d3-a456-426614174001', 
    description: 'ID связанного заказа (опционально)'
  })
  @IsUUID(4, { message: 'ID заказа должен быть валидным UUID' })
  @IsOptional()
  orderId?: string;

  @ApiProperty({ 
    example: '2024-01-15', 
    description: 'Дата выполнения обслуживания',
    format: 'date'
  })
  @IsDateString({}, { message: 'Дата должна быть в формате YYYY-MM-DD' })
  date: string;

  @ApiPropertyOptional({ 
    example: 75000, 
    description: 'Пробег автомобиля на момент обслуживания (км)',
    minimum: SERVICE_HISTORY_CONSTANTS.VALIDATION.MIN_MILEAGE,
    maximum: SERVICE_HISTORY_CONSTANTS.VALIDATION.MAX_MILEAGE
  })
  @IsInt({ message: 'Пробег должен быть целым числом' })
  @Min(SERVICE_HISTORY_CONSTANTS.VALIDATION.MIN_MILEAGE, { 
    message: `Пробег не может быть меньше ${SERVICE_HISTORY_CONSTANTS.VALIDATION.MIN_MILEAGE}` 
  })
  @Max(SERVICE_HISTORY_CONSTANTS.VALIDATION.MAX_MILEAGE, { 
    message: `Пробег не может быть больше ${SERVICE_HISTORY_CONSTANTS.VALIDATION.MAX_MILEAGE}` 
  })
  @IsOptional()
  mileage?: number;

  @ApiProperty({ 
    example: 'Замена моторного масла Shell 5W-30, замена масляного фильтра, проверка уровня жидкостей', 
    description: 'Подробное описание выполненных работ',
    minLength: SERVICE_HISTORY_CONSTANTS.VALIDATION.MIN_DESCRIPTION_LENGTH,
    maxLength: SERVICE_HISTORY_CONSTANTS.VALIDATION.MAX_DESCRIPTION_LENGTH
  })
  @IsString({ message: 'Описание должно быть строкой' })
  @IsNotEmpty({ message: 'Описание работ обязательно' })
  @MinLength(SERVICE_HISTORY_CONSTANTS.VALIDATION.MIN_DESCRIPTION_LENGTH, { 
    message: `Описание должно содержать минимум ${SERVICE_HISTORY_CONSTANTS.VALIDATION.MIN_DESCRIPTION_LENGTH} символов` 
  })
  @MaxLength(SERVICE_HISTORY_CONSTANTS.VALIDATION.MAX_DESCRIPTION_LENGTH, { 
    message: `Описание не может превышать ${SERVICE_HISTORY_CONSTANTS.VALIDATION.MAX_DESCRIPTION_LENGTH} символов` 
  })
  description: string;

  @ApiPropertyOptional({ 
    example: '2024-07-15', 
    description: 'Рекомендуемая дата следующего планового обслуживания',
    format: 'date'
  })
  @IsDateString({}, { message: 'Дата следующего ТО должна быть в формате YYYY-MM-DD' })
  @IsOptional()
  nextServiceDate?: string;

  @ApiPropertyOptional({ 
    example: 'Рекомендуется замена тормозных колодок при следующем ТО. Состояние резины хорошее.', 
    description: 'Дополнительные примечания и рекомендации',
    maxLength: SERVICE_HISTORY_CONSTANTS.VALIDATION.MAX_NOTES_LENGTH
  })
  @IsString({ message: 'Примечания должны быть строкой' })
  @MaxLength(SERVICE_HISTORY_CONSTANTS.VALIDATION.MAX_NOTES_LENGTH, { 
    message: `Примечания не могут превышать ${SERVICE_HISTORY_CONSTANTS.VALIDATION.MAX_NOTES_LENGTH} символов` 
  })
  @IsOptional()
  notes?: string;
}
```

## 📋 **Создай файл:** `src/modules/service-history/dto/response/service-history-response.dto.ts`

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ServiceHistoryResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174001' })
  vehicleId: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174002' })
  companyId: string;

  @ApiPropertyOptional({ example: '123e4567-e89b-12d3-a456-426614174003' })
  orderId?: string;

  @ApiProperty({ example: '2024-01-15' })
  date: Date;

  @ApiPropertyOptional({ example: 75000 })
  mileage?: number;

  @ApiProperty({ example: 'Замена моторного масла Shell 5W-30, замена масляного фильтра' })
  description: string;

  @ApiPropertyOptional({ example: '2024-07-15' })
  nextServiceDate?: Date;

  @ApiPropertyOptional({ example: 'Рекомендуется замена тормозных колодок при следующем ТО' })
  notes?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  // Дополнительные поля для UI
  @ApiPropertyOptional({ example: 'BMW X5 (А123БВ456)' })
  vehicleInfo?: string;

  @ApiPropertyOptional({ example: 'Иван Иванов' })
  customerName?: string;

  @ApiPropertyOptional({ example: 'BMW X5' })
  vehicleModelName?: string;

  @ApiPropertyOptional({ example: false })
  isOverdue?: boolean;

  @ApiPropertyOptional({ example: 45 })
  daysUntilNextService?: number;

  @ApiPropertyOptional({ example: 5000 })
  mileageSinceLastService?: number;

  @ApiPropertyOptional({ example: 180 })
  daysSinceService?: number;
}
```

## 📋 **Создай файл:** `src/modules/service-history/dto/response/paginated-service-history-response.dto.ts`

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { ServiceHistoryResponseDto } from './service-history-response.dto';

export class PaginatedServiceHistoryResponseDto {
  @ApiProperty({ type: [ServiceHistoryResponseDto] })
  items: ServiceHistoryResponseDto[];

  @ApiProperty({ example: 250 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;

  @ApiProperty({ example: 13 })
  totalPages: number;

  @ApiProperty({ example: true })
  hasNext: boolean;

  @ApiProperty({ example: false })
  hasPrev: boolean;

  @ApiProperty({ 
    example: {
      totalRecords: 250,
      averageServiceInterval: 125,
      upcomingServices: 12,
      overdueServices: 3,
      serviceFrequency: {
        thisMonth: 8,
        lastMonth: 6,
        thisYear: 95
      }
    }
  })
  meta?: {
    totalRecords: number;
    averageServiceInterval: number;
    upcomingServices: number;
    overdueServices: number;
    serviceFrequency: {
      thisMonth: number;
      lastMonth: number;
      thisYear: number;
    };
  };
}
```

---

## ✅ **ПРОВЕРКА ЭТАПА:**

Создай все 6 файлов и сообщи:
1. **Компилируется ли** проект?
2. **Готов ли к сервисам?**

**📋 СЛЕДУЮЩИЙ ЭТАП:** Создание всех 4 микросервисов (data, validation, business, mapper) + главный service!

Продолжаем создание безопасной Enterprise архитектуры! 🚀

