import { IsEmail, IsNotEmpty, IsOptional, IsUUID, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'ID компании',
  })
  @IsUUID('4', { message: 'Некорректный UUID компании' })
  @IsNotEmpty({ message: 'ID компании обязателен' })
  company_id: string;

  @ApiProperty({
    example: 'user@example.com',
    description: 'Email пользователя',
  })
  @IsEmail({}, { message: 'Некорректный email' })
  @IsNotEmpty({ message: 'Email обязателен' })
  email: string;

  @ApiProperty({
    example: 'password123',
    description: 'Пароль пользователя',
  })
  @IsNotEmpty({ message: 'Пароль обязателен' })
  @MinLength(6, { message: 'Пароль должен содержать минимум 6 символов' })
  password: string;

  @ApiProperty({
    example: 'Иван',
    description: 'Имя пользователя',
  })
  @IsNotEmpty({ message: 'Имя обязательно' })
  firstName: string;

  @ApiProperty({
    example: 'Иванов',
    description: 'Фамилия пользователя',
  })
  @IsNotEmpty({ message: 'Фамилия обязательна' })
  lastName: string;

  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'ID роли',
  })
  @IsUUID('4', { message: 'Некорректный UUID роли' })
  @IsNotEmpty({ message: 'ID роли обязателен' })
  role_id: string;

  @ApiProperty({
    example: '+7 (999) 123-45-67',
    description: 'Телефон пользователя',
    required: false,
  })
  @IsOptional()
  phone?: string;

  @ApiProperty({
    example: 'Моторист',
    description: 'Специализация (для механиков)',
    required: false,
  })
  @IsOptional()
  specialization?: string;
}