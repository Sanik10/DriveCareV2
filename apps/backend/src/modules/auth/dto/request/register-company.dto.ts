import { IsEmail, IsNotEmpty, IsOptional, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterCompanyDto {
  // Данные компании
  @ApiProperty({
    example: 'АвтоСервис "Профи"',
    description: 'Название компании',
  })
  @IsNotEmpty({ message: 'Название компании обязательно' })
  @MaxLength(255, { message: 'Название компании не может превышать 255 символов' })
  companyName: string;

  @ApiProperty({
    example: 'ООО "АвтоСервис Профи"',
    description: 'Юридическое название компании',
  })
  @IsNotEmpty({ message: 'Юридическое название обязательно' })
  @MaxLength(255, { message: 'Юридическое название не может превышать 255 символов' })
  companyLegalName: string;

  @ApiProperty({
    example: 'г. Москва, ул. Автомобильная, д. 1',
    description: 'Адрес компании',
    required: false,
  })
  @IsOptional()
  companyAddress?: string;

  @ApiProperty({
    example: '+7 (495) 123-45-67',
    description: 'Телефон компании',
    required: false,
  })
  @IsOptional()
  companyPhone?: string;

  @ApiProperty({
    example: 'info@autoservice.com',
    description: 'Email компании',
  })
  @IsEmail({}, { message: 'Некорректный email компании' })
  @IsNotEmpty({ message: 'Email компании обязателен' })
  companyEmail: string;

  // Данные владельца
  @ApiProperty({
    example: 'owner@autoservice.com',
    description: 'Email владельца (может отличаться от email компании)',
  })
  @IsEmail({}, { message: 'Некорректный email владельца' })
  @IsNotEmpty({ message: 'Email владельца обязателен' })
  ownerEmail: string;

  @ApiProperty({
    example: 'securePassword123',
    description: 'Пароль владельца',
  })
  @IsNotEmpty({ message: 'Пароль обязателен' })
  @MinLength(6, { message: 'Пароль должен содержать минимум 6 символов' })
  ownerPassword: string;

  @ApiProperty({
    example: 'Иван',
    description: 'Имя владельца',
  })
  @IsNotEmpty({ message: 'Имя владельца обязательно' })
  @MaxLength(100, { message: 'Имя не может превышать 100 символов' })
  ownerFirstName: string;

  @ApiProperty({
    example: 'Петров',
    description: 'Фамилия владельца',
  })
  @IsNotEmpty({ message: 'Фамилия владельца обязательна' })
  @MaxLength(100, { message: 'Фамилия не может превышать 100 символов' })
  ownerLastName: string;

  @ApiProperty({
    example: '+7 (999) 123-45-67',
    description: 'Телефон владельца',
    required: false,
  })
  @IsOptional()
  ownerPhone?: string;
}
