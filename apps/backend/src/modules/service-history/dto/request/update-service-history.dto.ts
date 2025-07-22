import { PartialType } from '@nestjs/swagger';
import { CreateServiceHistoryDto } from './create-service-history.dto';

/**
 * DTO для обновления записи истории обслуживания
 * 🔒 SECURITY: vehicleId нельзя изменить - запись всегда привязана к исходному автомобилю
 */
export class UpdateServiceHistoryDto extends PartialType(CreateServiceHistoryDto) {
  // 🔥 ИСПРАВЛЕНО: Все поля опциональны, vehicleId не меняется
  // Наследуется от CreateServiceHistoryDto но все поля становятся опциональными
}
