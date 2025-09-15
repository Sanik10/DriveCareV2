// path: apps/backend/src/modules/auth/dto/request/refresh-token.dto.ts

import { IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefreshTokenDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'Refresh токен',
  })
  @IsNotEmpty({ message: 'Refresh токен обязателен' })
  refreshToken: string;
}