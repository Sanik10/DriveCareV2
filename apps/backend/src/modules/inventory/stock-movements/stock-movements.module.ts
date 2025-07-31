// src/modules/inventory/stock-movements/stock-movements.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StockMovementsController } from './stock-movements.controller';
import { StockMovementsService } from './stock-movements.service';
import { StockMovementsDataService } from './services/stock-movements-data.service';
import { StockMovementsBusinessService } from './services/stock-movements-business.service';
import { StockMovementsValidationService } from './services/stock-movements-validation.service';
import { StockMovementsMapperService } from './services/stock-movements-mapper.service';
import { 
  StockMovement,
  Inventory,
  Part,
  PartCategory,
  Supplier,
  Company,
  Order,
  User
} from '../../../database/entities';
import { AuditService } from '../../../common/audit/audit.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      StockMovement,   // 🔥 Основная entity
      Inventory,       // Для обновления остатков
      Part,           // Информация о запчастях
      PartCategory,   // Категории
      Supplier,       // Поставщики
      Company,        // Security
      Order,          // Связь с заказами
      User,           // Кто создал движение
    ]),
  ],
  controllers: [StockMovementsController],
  providers: [
    StockMovementsService,
    StockMovementsDataService,
    StockMovementsBusinessService,
    StockMovementsValidationService,
    StockMovementsMapperService,
    AuditService,
  ],
  exports: [
    StockMovementsService,
    StockMovementsDataService,
    StockMovementsMapperService,
  ],
})
export class StockMovementsModule {}
