import { IsEmail, IsOptional, IsUUID, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'Email пользователя',
    required: false,
  })
  @IsEmail({}, { message: 'Некорректный email' })
  @IsOptional()
  email?: string;

  @ApiProperty({
    example: 'password123',
    description: 'Пароль пользователя',
    required: false,
  })
  @MinLength(6, { message: 'Пароль должен содержать минимум 6 символов' })
  @IsOptional()
  password?: string;

  @ApiProperty({
    example: 'Иван',
    description: 'Имя пользователя',
    required: false,
  })
  @IsOptional()
  firstName?: string;

  @ApiProperty({
    example: 'Иванов',
    description: 'Фамилия пользователя',
    required: false,
  })
  @IsOptional()
  lastName?: string;

  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'ID роли',
    required: false,
  })
  @IsUUID('4', { message: 'Некорректный UUID роли' })
  @IsOptional()
  role_id?: string;

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

  @ApiProperty({
    example: true,
    description: 'Активен ли пользователь',
    required: false,
  })
  @IsOptional()
  isActive?: boolean;
}