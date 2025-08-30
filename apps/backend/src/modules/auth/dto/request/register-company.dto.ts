// path: apps/backend/src/modules/auth/dto/request/register-company.dto.ts
import { IsEmail, IsNotEmpty, IsOptional, MinLength, MaxLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class RegisterCompanyDto {
  @ApiProperty({ example: 'АвтоСервис "Профи"', description: 'Название компании' })
  @IsNotEmpty({ message: 'Название компании обязательно' })
  @MaxLength(255, { message: 'Название компании не может превышать 255 символов' })
  companyName: string;

  @ApiProperty({ example: 'ООО "АвтоСервис Профи"', description: 'Юридическое название компании' })
  @IsNotEmpty({ message: 'Юридическое название обязательно' })
  @MaxLength(255, { message: 'Юридическое название не может превышать 255 символов' })
  companyLegalName: string;

  @ApiProperty({ example: 'г. Москва, ул. Автомобильная, д. 1', required: false })
  @IsOptional()
  @MaxLength(500, { message: 'Адрес не может превышать 500 символов' })
  @Transform(({ value }) => value === '' ? undefined : value)
  companyAddress?: string;

  @ApiProperty({ example: '+7 (495) 123-45-67', required: false })
  @IsOptional()
  @Matches(/^[+]?[0-9\s\-()]{7,20}$/, { message: 'Некорректный формат номера телефона' })
  @Transform(({ value }) => value === '' ? undefined : value)
  companyPhone?: string;

  @ApiProperty({ example: 'info@autoservice.com' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail({}, { message: 'Некорректный email компании' })
  @IsNotEmpty({ message: 'Email компании обязателен' })
  companyEmail: string;

  @ApiProperty({ example: 'owner@autoservice.com' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail({}, { message: 'Некорректный email владельца' })
  @IsNotEmpty({ message: 'Email владельца обязателен' })
  ownerEmail: string;

  @ApiProperty({
    example: 'SecurePass123!',
    description: 'Пароль владельца (мин. 8, буквы в разных регистрах, цифры и спецсимволы)',
  })
  @IsNotEmpty({ message: 'Пароль обязателен' })
  @MinLength(8, { message: 'Пароль должен содержать минимум 8 символов' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>_+=\-\\;'`~])[A-Za-z\d!@#$%^&*(),.?":{}|<>_+=\-\\;'`~]{8,}$/, {
    message: 'Пароль должен содержать строчные и заглавные буквы, цифры и спецсимволы',
  })
  ownerPassword: string;

  @ApiProperty({ example: 'Иван' })
  @IsNotEmpty({ message: 'Имя владельца обязательно' })
  @MaxLength(100)
  @Matches(/^[а-яёА-ЯЁa-zA-Z\s-]+$/, { message: 'Имя может содержать только буквы, пробелы и дефисы' })
  ownerFirstName: string;

  @ApiProperty({ example: 'Петров' })
  @IsNotEmpty({ message: 'Фамилия владельца обязательна' })
  @MaxLength(100)
  @Matches(/^[а-яёА-ЯЁa-zA-Z\s-]+$/, { message: 'Фамилия может содержать только буквы, пробелы и дефисы' })
  ownerLastName: string;

  @ApiProperty({ example: '+7 (999) 123-45-67', required: false })
  @IsOptional()
  @Matches(/^[+]?[0-9\s\-()]{7,20}$/, { message: 'Некорректный формат номера телефона' })
  @Transform(({ value }) => value === '' ? undefined : value)
  ownerPhone?: string;
}
