import { ApiProperty } from '@nestjs/swagger';

export class UserDto {
  @ApiProperty({ example: 'uuid', description: 'ID пользователя' })
  id: string;

  @ApiProperty({ example: 'user@example.com', description: 'Email' })
  email: string;

  @ApiProperty({ example: 'John', description: 'Имя' })
  firstName: string;

  @ApiProperty({ example: 'Doe', description: 'Фамилия' })
  lastName: string;

  @ApiProperty({ example: '+7 999 123 45 67', description: 'Телефон', required: false })
  phone?: string;

  @ApiProperty({ example: true, description: 'Активен ли пользователь' })
  isActive: boolean;

  @ApiProperty({ 
    example: { id: 'uuid', name: 'owner' }, 
    description: 'Роль пользователя' 
  })
  role: {
    id: string;
    name: string;
  };

  @ApiProperty({ example: 'uuid', description: 'ID компании', required: false })
  company_id?: string;

  @ApiProperty({ example: '2025-01-01T00:00:00Z', description: 'Дата создания' })
  createdAt: Date;
}

export class LoginResponseDto {
  @ApiProperty({ type: UserDto, description: 'Информация о пользователе' })
  user: UserDto;

  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...', description: 'JWT-токен доступа' })
  accessToken: string;

  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...', description: 'Refresh-токен' })
  refreshToken: string;

  @ApiProperty({ example: '15m', description: 'Время жизни токена доступа' })
  expiresIn: string;

  @ApiProperty({ example: 'device-uuid-123', description: 'ID устройства' })
  deviceId: string;
}