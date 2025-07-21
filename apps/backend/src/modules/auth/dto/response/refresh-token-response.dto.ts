import { ApiProperty } from '@nestjs/swagger';
import { UserDto } from './login-response.dto';

export class RefreshTokenResponseDto {
  @ApiProperty({ type: UserDto, description: 'Информация о пользователе' })
  user: UserDto;

  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...', description: 'Новый JWT-токен доступа' })
  accessToken: string;

  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...', description: 'Новый refresh-токен' })
  refreshToken: string;

  @ApiProperty({ example: '15m', description: 'Время жизни токена доступа' })
  expiresIn: string;

  @ApiProperty({ example: 'device-uuid-123', description: 'ID устройства' })
  deviceId: string;
}