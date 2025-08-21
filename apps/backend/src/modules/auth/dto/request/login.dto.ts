import { IsEmail, IsNotEmpty, MinLength, Matches, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class LoginDto {
  @ApiProperty({ example: 'user@example.com', description: 'Email пользователя' })
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

  @ApiPropertyOptional({ example: '123456', description: 'Код 2FA (если включен)' })
  @IsOptional()
  @Matches(/^\d{6}$/, { message: 'Код 2FA должен состоять из 6 цифр' })
  twoFactorCode?: string;
}
