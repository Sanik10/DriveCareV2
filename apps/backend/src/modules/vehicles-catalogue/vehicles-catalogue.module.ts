import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VehiclesCatalogueController } from './vehicles-catalogue.controller';
import { VehiclesCatalogueService } from './vehicles-catalogue.service';
import { BrandsDataService } from './services/brands-data.service';
import { ModelsDataService } from './services/models-data.service';
import { TypesDataService } from './services/types-data.service';
import { CatalogueBusinessService } from './services/catalogue-business.service';
import { CatalogueValidationService } from './services/catalogue-validation.service';
import { CatalogueMapperService } from './services/catalogue-mapper.service';
import { VehicleBrand, VehicleModel, VehicleType, Vehicle } from '../../database/entities';
import { AuditService } from '../../common/audit/audit.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      VehicleBrand,    // 🔒 Основная entity для брендов
      VehicleModel,    // 🔒 Основная entity для моделей  
      VehicleType,     // 🔒 Основная entity для типов
      Vehicle,         // 🔥 ОБЯЗАТЕЛЬНО: для проверки связей при удалении
    ]),
  ],
  controllers: [VehiclesCatalogueController],
  providers: [
    VehiclesCatalogueService,
    BrandsDataService,
    ModelsDataService,
    TypesDataService,
    CatalogueBusinessService,
    CatalogueValidationService,
    CatalogueMapperService,
    AuditService,
  ],
  exports: [
    VehiclesCatalogueService,
    BrandsDataService,
    ModelsDataService,
    TypesDataService,
    CatalogueMapperService,
  ],
})
export class VehiclesCatalogueModule {}
