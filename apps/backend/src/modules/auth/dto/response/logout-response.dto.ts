import { ApiProperty } from '@nestjs/swagger';

export class LogoutResponseDto {
  @ApiProperty({ example: true, description: 'Статус выполнения операции' })
  success: boolean;

  @ApiProperty({ example: 'Выход выполнен успешно', description: 'Сообщение', required: false })
  message?: string;
}