// path: apps/backend/src/modules/users/dto/request/update-user-role.dto.ts
import { IsUUID, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserRoleDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'UUID новой роли пользователя',
    format: 'uuid'
  })
  @IsUUID('4', { message: 'Некорректный UUID роли' })
  @IsNotEmpty({ message: 'ID роли обязателен' })
  role_id: string;
}
