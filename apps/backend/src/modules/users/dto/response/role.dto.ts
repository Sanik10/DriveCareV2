// path: apps/backend/src/modules/users/dto/response/role.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class RoleDto {
  @ApiProperty({
    example: '1',
    description: 'ID роли',
  })
  id: string;

  @ApiProperty({
    example: 'admin',
    description: 'Название роли',
  })
  name: string;
}
