import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CompanySubscriptionInfo } from '../../types/companies.types';

export class CompanyResponseDto {
  @ApiProperty({ 
    description: 'Уникальный идентификатор компании',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  id: string;

  @ApiProperty({ 
    description: 'Название компании',
    example: 'АвтоСервис "Профи"'
  })
  name: string;

  @ApiProperty({ 
    description: 'Юридическое название',
    example: 'ООО "АвтоСервис Профи"'
  })
  legalName: string;

  @ApiPropertyOptional({ 
    description: 'ИНН/налоговый номер',
    example: '7712345678'
  })
  taxNumber?: string;

  @ApiPropertyOptional({ 
    description: 'Адрес компании',
    example: 'г. Москва, ул. Автомобильная, д. 15'
  })
  address?: string;

  @ApiPropertyOptional({ 
    description: 'Телефон компании',
    example: '+7 (495) 123-45-67'
  })
  phone?: string;

  @ApiProperty({ 
    description: 'Email компании',
    example: 'info@autoservice-profi.ru'
  })
  email: string;

  @ApiPropertyOptional({ 
    description: 'Веб-сайт компании',
    example: 'https://autoservice-profi.ru'
  })
  website?: string;

  @ApiPropertyOptional({ 
    description: 'URL логотипа',
    example: 'https://autoservice-profi.ru/logo.png'
  })
  logoUrl?: string;

  @ApiPropertyOptional({ 
    description: 'Часы работы в JSON формате',
    example: {
      monday: { open: '09:00', close: '18:00', isOpen: true },
      tuesday: { open: '09:00', close: '18:00', isOpen: true }
    }
  })
  workingHours?: Record<string, any>;

  @ApiProperty({ 
    description: 'Активна ли компания',
    example: true
  })
  isActive: boolean;

  @ApiProperty({ 
    description: 'Дата создания',
    example: '2025-01-01T10:00:00.000Z'
  })
  createdAt: Date;

  @ApiProperty({ 
    description: 'Дата обновления',
    example: '2025-01-01T12:00:00.000Z'
  })
  updatedAt: Date;

  @ApiPropertyOptional({ 
    description: 'Информация о текущей подписке',
    example: {
      id: '456e7890-e89b-12d3-a456-426614174001',
      tariffName: 'Стандарт',
      endDate: '2025-12-31T23:59:59.000Z',
      status: 'active'
    }
  })
  subscription?: CompanySubscriptionInfo;
}
