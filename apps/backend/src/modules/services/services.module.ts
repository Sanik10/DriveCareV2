import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Service, ServiceCategory } from '../../database/entities';

// 🎯 Main Services
import { ServicesController } from './services.controller';
import { ServicesService } from './services.service';
import { ServicesBusinessService } from './services/services-business.service';
import { ServicesDataService } from './services/services-data.service';
import { ServicesValidationService } from './services/services-validation.service';
import { ServicesMapperService } from './services/services-mapper.service';

// 📋 Service Categories Sub-module
import { ServiceCategoriesController } from './categories/categories.controller';
import { CategoriesService } from './categories/categories.service';
import { CategoriesBusinessService } from './categories/services/categories-business.service';
import { CategoriesDataService } from './categories/services/categories-data.service';
import { CategoriesValidationService } from './categories/services/categories-validation.service';
import { CategoriesMapperService } from './categories/services/categories-mapper.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Service, ServiceCategory]), // 🔧 Правильный импорт entities
  ],
  controllers: [
    ServicesController,
    ServiceCategoriesController, // 📋 Categories sub-module
  ],
  providers: [
    // 🎯 Main Services
    ServicesService,
    ServicesBusinessService,
    ServicesDataService,
    ServicesValidationService,
    ServicesMapperService,
    
    // 📋 Categories Services
    CategoriesService,
    CategoriesBusinessService,
    CategoriesDataService,
    CategoriesValidationService,
    CategoriesMapperService,
  ],
  exports: [
    ServicesService,
    ServicesValidationService, // 🔒 Экспортируем для CompanyOwnershipGuard
    CategoriesService,
    CategoriesValidationService, // 🔒 Экспортируем для CompanyOwnershipGuard
  ],
})
export class ServicesModule {}
