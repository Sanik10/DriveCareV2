import { PartialType } from '@nestjs/swagger';
import { CreateCustomerDto } from './create-customer.dto';

/**
 * DTO для обновления клиента
 * 🔒 SECURITY: companyId нельзя изменить - клиент всегда принадлежит к исходной компании
 */
export class UpdateCustomerDto extends PartialType(CreateCustomerDto) {
  // 🔥 ИСПРАВЛЕНО: Убрали возможность изменять companyId
  // Клиент не может быть перенесен в другую компанию
}
