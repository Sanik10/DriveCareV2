// path: apps/backend/src/modules/auth/dto/request/register-invite.dto.ts
import { IsEmail, IsNotEmpty, IsOptional, IsUUID, MinLength, MaxLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class RegisterInviteDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'Код приглашения (UUID)' })
  @IsUUID('4', { message: 'Некорректный код приглашения' })
  @IsNotEmpty({ message: 'Код приглашения обязателен' })
  inviteCode: string;

  @ApiProperty({ example: 'mechanic@autoservice.com' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail({}, { message: 'Некорректный email' })
  @IsNotEmpty({ message: 'Email обязателен' })
  email: string;

  @ApiProperty({
    example: 'SecurePass123!',
    description: 'Пароль (мин. 8, буквы в разных регистрах, цифры и спецсимволы)',
  })
  @IsNotEmpty({ message: 'Пароль обязателен' })
  @MinLength(8, { message: 'Пароль должен содержать минимум 8 символов' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/, {
    message: 'Пароль должен содержать строчные и заглавные буквы, цифры и спецсимволы (@$!%*?&)',
  })
  password: string;

  @ApiProperty({ example: 'Петр' })
  @IsNotEmpty({ message: 'Имя обязательно' })
  @MaxLength(100)
  firstName: string;

  @ApiProperty({ example: 'Сидоров' })
  @IsNotEmpty({ message: 'Фамилия обязательна' })
  @MaxLength(100)
  lastName: string;

  @ApiProperty({ example: '+7 (999) 123-45-67', required: false })
  @IsOptional()
  phone?: string;

  @ApiProperty({ example: 'Моторист', required: false })
  @IsOptional()
  specialization?: string;
}
