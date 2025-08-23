// path: apps/backend/src/modules/services/dto/request/update-service.dto.ts
import { PartialType } from '@nestjs/swagger';
import { CreateServiceDto } from './create-service.dto';

export class UpdateServiceDto extends PartialType(CreateServiceDto) {}
