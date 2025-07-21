import { IsEmail, IsNotEmpty, IsOptional, IsUUID, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterInviteDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Код приглашения (UUID)',
  })
  @IsUUID('4', { message: 'Некорректный код приглашения' })
  @IsNotEmpty({ message: 'Код приглашения обязателен' })
  inviteCode: string;

  @ApiProperty({
    example: 'mechanic@autoservice.com',
    description: 'Email пользователя',
  })
  @IsEmail({}, { message: 'Некорректный email' })
  @IsNotEmpty({ message: 'Email обязателен' })
  email: string;

  @ApiProperty({
    example: 'securePassword123',
    description: 'Пароль пользователя',
  })
  @IsNotEmpty({ message: 'Пароль обязателен' })
  @MinLength(6, { message: 'Пароль должен содержать минимум 6 символов' })
  password: string;

  @ApiProperty({
    example: 'Петр',
    description: 'Имя пользователя',
  })
  @IsNotEmpty({ message: 'Имя обязательно' })
  @MaxLength(100, { message: 'Имя не может превышать 100 символов' })
  firstName: string;

  @ApiProperty({
    example: 'Сидоров',
    description: 'Фамилия пользователя',
  })
  @IsNotEmpty({ message: 'Фамилия обязательна' })
  @MaxLength(100, { message: 'Фамилия не может превышать 100 символов' })
  lastName: string;

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
