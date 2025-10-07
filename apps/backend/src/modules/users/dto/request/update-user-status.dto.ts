// path: apps/backend/src/modules/users/dto/request/update-user-status.dto.ts
import { IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserStatusDto {
  @ApiProperty({
    example: true,
    description: 'Новый статус активности пользователя (true = активен, false = заблокирован)',
    type: 'boolean'
  })
  @IsBoolean({ message: 'Статус активности должен быть true или false' })
  isActive: boolean;
}
