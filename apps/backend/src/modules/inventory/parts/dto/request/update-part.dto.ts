// src/modules/inventory/parts/dto/request/update-part.dto.ts
import { PartialType } from '@nestjs/swagger';
import { CreatePartDto } from './create-part.dto';

/**
 * DTO для обновления запчасти
 * Все поля опциональны - наследует от CreatePartDto через PartialType
 */
export class UpdatePartDto extends PartialType(CreatePartDto) {}
