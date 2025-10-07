// path: apps/backend/src/modules/users/dto/request/create-user.dto.ts
import { 
  IsEmail, 
  IsNotEmpty, 
  IsOptional, 
  IsUUID, 
  MinLength, 
  Matches,
  Length,
  IsPhoneNumber
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  // Компания определяется из JWT токена в контроллере
  
  @ApiProperty({
    example: 'user@example.com',
    description: 'Email пользователя (уникальный)',
    format: 'email'
  })
  @IsEmail({}, { message: 'Некорректный формат email' })
  @IsNotEmpty({ message: 'Email обязателен' })
  @Length(1, 255, { message: 'Email не может превышать 255 символов' })
  email: string;

  @ApiProperty({
    example: 'SecurePass123!',
    description: 'Надежный пароль пользователя',
    minLength: 8,
    pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$'
  })
  @IsNotEmpty({ message: 'Пароль обязателен' })
  @MinLength(8, { message: 'Пароль должен содержать минимум 8 символов' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/, {
    message: 'Пароль должен содержать: строчные буквы, заглавные буквы, цифры и спецсимволы (@$!%*?&)'
  })
  password: string;

  @ApiProperty({
    example: 'Иван',
    description: 'Имя пользователя',
    minLength: 1,
    maxLength: 50
  })
  @IsNotEmpty({ message: 'Имя обязательно' })
  @Length(1, 50, { message: 'Имя должно быть от 1 до 50 символов' })
  @Matches(/^[a-zA-Zа-яА-Я\s\-']+$/, { 
    message: 'Имя может содержать только буквы, пробелы, дефисы и апострофы' 
  })
  @Transform(({ value }) => value?.trim())
  firstName: string;

  @ApiProperty({
    example: 'Иванов',
    description: 'Фамилия пользователя',
    minLength: 1,
    maxLength: 50
  })
  @IsNotEmpty({ message: 'Фамилия обязательна' })
  @Length(1, 50, { message: 'Фамилия должна быть от 1 до 50 символов' })
  @Matches(/^[a-zA-Zа-яА-Я\s\-']+$/, { 
    message: 'Фамилия может содержать только буквы, пробелы, дефисы и апострофы' 
  })
  @Transform(({ value }) => value?.trim())
  lastName: string;

  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'UUID роли пользователя',
    format: 'uuid'
  })
  @IsUUID('4', { message: 'Некорректный UUID роли' })
  @IsNotEmpty({ message: 'ID роли обязателен' })
  role_id: string;

  @ApiProperty({
    example: '+79991234567',
    description: 'Российский номер телефона',
    required: false,
    pattern: '^\\+7[0-9]{10}$'
  })
  @IsOptional()
  @IsPhoneNumber('RU', { message: 'Некорректный российский номер телефона' })
  @Transform(({ value }) => {
    if (!value) return value;
    const digits = value.replace(/\D/g, '');
    if (digits.startsWith('8')) {
      return '+7' + digits.substring(1);
    }
    if (digits.startsWith('7')) {
      return '+' + digits;
    }
    return '+7' + digits;
  })
  phone?: string;

  @ApiProperty({
    example: 'Специалист по двигателям',
    description: 'Специализация сотрудника (для механиков, диагностов и т.д.)',
    required: false,
    maxLength: 100
  })
  @IsOptional()
  @Length(1, 100, { message: 'Специализация не может превышать 100 символов' })
  @Matches(/^[a-zA-Zа-яА-Я\s\-'.,()0-9]+$/, { 
    message: 'Специализация содержит недопустимые символы' 
  })
  @Transform(({ value }) => value?.trim())
  specialization?: string;
}
