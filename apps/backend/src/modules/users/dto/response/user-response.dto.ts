import { ApiProperty } from '@nestjs/swagger';
import { RoleDto } from './role.dto';

export class UserResponseDto {
  @ApiProperty({ example: 'uuid', description: 'ID пользователя' })
  id: string;

  @ApiProperty({ example: 'user@example.com', description: 'Email' })
  email: string;

  @ApiProperty({ example: 'John', description: 'Имя' })
  firstName: string;

  @ApiProperty({ example: 'Doe', description: 'Фамилия' })
  lastName: string;

  @ApiProperty({ example: '+7 999 123 45 67', description: 'Телефон' })
  phone: string;

  @ApiProperty({ example: true, description: 'Активен ли пользователь' })
  isActive: boolean;

  @ApiProperty({ description: 'Роль пользователя', type: RoleDto })
  role: RoleDto;

  @ApiProperty({ example: 'uuid', description: 'ID компании', required: false }) // Изменено: добавлен required: false
  company_id: string | null; // Изменено: добавлен union type с null

  @ApiProperty({ example: '2025-01-01T00:00:00Z', description: 'Дата создания' })
  createdAt: Date;
}