import { 
  IsEmail, 
  IsOptional, 
  Length,
  Matches,
  IsPhoneNumber
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserProfileDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'Новый email пользователя',
    required: false,
    format: 'email'
  })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail({}, { message: 'Некорректный формат email' })
  @Length(1, 255, { message: 'Email не может превышать 255 символов' })
  email?: string;

  @ApiProperty({
    example: 'Иван',
    description: 'Новое имя пользователя',
    required: false,
    maxLength: 50
  })
  @IsOptional()
  @Length(1, 50, { message: 'Имя должно быть от 1 до 50 символов' })
  @Matches(/^[a-zA-Zа-яА-Я\s\-']+$/, { 
    message: 'Имя может содержать только буквы, пробелы, дефисы и апострофы' 
  })
  @Transform(({ value }) => value?.trim())
  firstName?: string;

  @ApiProperty({
    example: 'Иванов',
    description: 'Новая фамилия пользователя',
    required: false,
    maxLength: 50
  })
  @IsOptional()
  @Length(1, 50, { message: 'Фамилия должна быть от 1 до 50 символов' })
  @Matches(/^[a-zA-Zа-яА-Я\s\-']+$/, { 
    message: 'Фамилия может содержать только буквы, пробелы, дефисы и апострофы' 
  })
  @Transform(({ value }) => value?.trim())
  lastName?: string;

  @ApiProperty({
    example: '+79991234567',
    description: 'Новый номер телефона',
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
    example: 'Старший специалист по трансмиссии',
    description: 'Новая специализация',
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
