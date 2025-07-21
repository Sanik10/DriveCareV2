import { ApiProperty } from '@nestjs/swagger';
import { UserResponseDto } from './user-response.dto';

export class ProfileResponseDto {
  @ApiProperty({ description: 'Данные пользователя', type: UserResponseDto })
  user: UserResponseDto;
}