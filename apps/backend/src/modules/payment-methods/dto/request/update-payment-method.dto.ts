// path: apps/backend/src/modules/payment-methods/dto/request/update-payment-method.dto.ts
import { PartialType } from '@nestjs/swagger';
import { CreatePaymentMethodDto } from './create-payment-method.dto';

export class UpdatePaymentMethodDto extends PartialType(CreatePaymentMethodDto) {}
