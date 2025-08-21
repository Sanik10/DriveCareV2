import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CompanySubscriptionInfo } from '../../types/companies.types';
import { WorkingHoursDto } from '../request/create-company.dto';

// ✅ ДОБАВЛЕНО: Type converter для совместимости
export type WorkingHoursResponse = WorkingHoursDto;

export class CompanyBasicResponseDto {
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
    description: 'Email компании',
    example: 'info@autoservice-profi.ru'
  })
  email: string;

  @ApiPropertyOptional({ 
    description: 'Телефон компании',
    example: '+7 (495) 123-45-67'
  })
  phone?: string;

  @ApiPropertyOptional({ 
    description: 'Веб-сайт компании',
    example: 'https://autoservice-profi.ru'
  })
  website?: string;

  @ApiProperty({ 
    description: 'Активна ли компания',
    example: true
  })
  isActive: boolean;

  @ApiPropertyOptional({ 
    description: 'Часы работы',
    type: 'object' // ✅ ИСПРАВЛЕНО: Упрощенная типизация для swagger
  })
  workingHours?: WorkingHoursResponse;
}

export class CompanyResponseDto extends CompanyBasicResponseDto {
  @ApiProperty({ 
    description: 'Юридическое название',
    example: 'ООО "АвтоСервис Профи"'
  })
  legalName: string;

  @ApiPropertyOptional({ 
    description: '🔒 ИНН/налоговый номер (доступен только владельцам и админам)',
    example: '7712345678'
  })
  taxNumber?: string;

  @ApiPropertyOptional({ 
    description: 'Адрес компании',
    example: 'г. Москва, ул. Автомобильная, д. 15'
  })
  address?: string;

  @ApiPropertyOptional({ 
    description: 'URL логотипа',
    example: 'https://autoservice-profi.ru/logo.png'
  })
  logoUrl?: string;

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
    description: '🔒 Информация о подписке (доступна только владельцам и админам)',
    example: {
      id: '456e7890-e89b-12d3-a456-426614174001',
      tariffName: 'Стандарт',
      endDate: '2025-12-31T23:59:59.000Z',
      status: 'active'
    }
  })
  subscription?: CompanySubscriptionInfo;
}

export class CompanyPublicResponseDto {
  @ApiProperty({ description: 'Идентификатор компании' })
  id: string;

  @ApiProperty({ description: 'Название компании' })
  name: string;

  @ApiPropertyOptional({ description: 'Веб-сайт компании' })
  website?: string;

  @ApiPropertyOptional({ description: 'URL логотипа' })
  logoUrl?: string;

  @ApiPropertyOptional({ description: 'Часы работы' })
  workingHours?: WorkingHoursResponse; // ✅ ИСПРАВЛЕНО

  @ApiProperty({ description: 'Активна ли компания' })
  isActive: boolean;
}
