import { ApiProperty } from '@nestjs/swagger';
import { UserResponseDto } from './user-response.dto';

export class PaginatedUsersResponseDto {
  @ApiProperty({ 
    description: 'Список пользователей компании', 
    type: [UserResponseDto],
    example: [
      {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'mechanic@autoservice.ru',
        firstName: 'Алексей',
        lastName: 'Механиков',
        phone: '+79991234567',
        specialization: 'Специалист по двигателям',
        isActive: true,
        role: { id: 'role-uuid', name: 'mechanic' },
        createdAt: '2025-01-06T10:00:00Z',
        lastLoginAt: '2025-01-06T09:30:00Z'
      }
    ]
  })
  users: UserResponseDto[];

  @ApiProperty({ 
    example: 1, 
    description: 'Текущая страница (начинается с 1)',
    minimum: 1
  })
  page: number;

  @ApiProperty({ 
    example: 20, 
    description: 'Количество элементов на текущей странице',
    minimum: 1,
    maximum: 100
  })
  limit: number;

  @ApiProperty({ 
    example: 156, 
    description: 'Общее количество пользователей в компании',
    minimum: 0
  })
  total: number;

  @ApiProperty({ 
    example: 8, 
    description: 'Общее количество страниц',
    minimum: 0
  })
  totalPages: number;

  @ApiProperty({ 
    example: true, 
    description: 'Есть ли следующая страница',
    type: 'boolean'
  })
  hasNext: boolean;

  @ApiProperty({ 
    example: false, 
    description: 'Есть ли предыдущая страница',
    type: 'boolean'
  })
  hasPrev: boolean;

  @ApiProperty({
    example: {
      search: 'Алексей',
      isActive: true,
      role: 'mechanic'
    },
    description: 'Примененные фильтры',
    required: false
  })
  appliedFilters?: {
    search?: string;
    isActive?: boolean;
    role?: string;
  };
}
