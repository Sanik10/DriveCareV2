// path: apps/backend/src/modules/inventory/parts/dto/request/update-part.dto.ts
import { PartialType } from '@nestjs/swagger';
import { CreatePartDto } from './create-part.dto';

/**
 * DTO для обновления запчасти — все поля опциональны.
 */
export class UpdatePartDto extends PartialType(CreatePartDto) {}
