// apps/backend/src/modules/customers/dto/request/update-customer.dto.ts
import { PartialType } from '@nestjs/swagger';
import { CreateCustomerDto } from './create-customer.dto';

/**
 * DTO для обновления клиента
 * 🔒 SECURITY: companyId нельзя изменить - клиент всегда принадлежит к исходной компании
 */
export class UpdateCustomerDto extends PartialType(CreateCustomerDto) {
  // companyId не передаётся и не может быть изменён
}
