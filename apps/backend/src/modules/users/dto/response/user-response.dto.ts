// path: apps/backend/src/modules/users/dto/response/user-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { RoleDto } from './role.dto';

/**
 * USER RESPONSE DTO
 * SECURITY: company_id не возвращаем
 */
export class UserResponseDto {
  @ApiProperty({ 
    example: '123e4567-e89b-12d3-a456-426614174000', 
    description: 'Уникальный идентификатор пользователя',
    format: 'uuid'
  })
  id: string;

  @ApiProperty({ 
    example: 'mechanic@autoservice.ru', 
    description: 'Email адрес пользователя',
    format: 'email'
  })
  email: string;

  @ApiProperty({ 
    example: 'Алексей', 
    description: 'Имя пользователя',
    minLength: 1,
    maxLength: 50
  })
  firstName: string;

  @ApiProperty({ 
    example: 'Механиков', 
    description: 'Фамилия пользователя',
    minLength: 1,
    maxLength: 50
  })
  lastName: string;

  @ApiProperty({ 
    example: '+79991234567', 
    description: 'Номер телефона в российском формате',
    required: false,
    pattern: '^\\+7[0-9]{10}$'
  })
  phone?: string;

  @ApiProperty({ 
    example: 'Специалист по двигателям', 
    description: 'Профессиональная специализация сотрудника',
    required: false,
    maxLength: 100
  })
  specialization?: string;

  @ApiProperty({ 
    example: true, 
    description: 'Статус активности пользователя (true = активен, false = заблокирован)',
    type: 'boolean'
  })
  isActive: boolean;

  @ApiProperty({ 
    description: 'Роль пользователя в системе', 
    type: RoleDto,
    example: {
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'mechanic'
    }
  })
  role: RoleDto;

  @ApiProperty({ 
    example: '2025-01-06T10:30:00.000Z', 
    description: 'Дата и время создания аккаунта пользователя',
    format: 'date-time'
  })
  createdAt: Date;

  @ApiProperty({ 
    example: '2025-01-06T09:15:00.000Z', 
    description: 'Дата и время последнего входа в систему',
    format: 'date-time',
    required: false
  })
  lastLoginAt?: Date;
}
