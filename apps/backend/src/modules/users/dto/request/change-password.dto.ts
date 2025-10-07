// path: apps/backend/src/modules/users/dto/request/change-password.dto.ts
import { IsNotEmpty, MinLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
  @ApiProperty({
    example: 'NewSecurePass456!',
    description: 'Новый надежный пароль',
    minLength: 8,
    // Расширенный паттерн со множеством допустимых спецсимволов
    pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[!@#$%^&*(),.?":{}|<>_+=\\-\\\\;\'`~])[A-Za-z\\d!@#$%^&*(),.?":{}|<>_+=\\-\\\\;\'`~]{8,}$',
  })
  @IsNotEmpty({ message: 'Новый пароль обязателен' })
  @MinLength(8, { message: 'Пароль должен содержать минимум 8 символов' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>_+=\-\\;'`~])[A-Za-z\d!@#$%^&*(),.?":{}|<>_+=\-\\;'`~]{8,}$/,
    {
      message: 'Пароль должен содержать строчные и заглавные буквы, цифры и спецсимволы',
    },
  )
  newPassword: string;
}
