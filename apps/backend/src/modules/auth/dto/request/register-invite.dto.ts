// path: apps/backend/src/modules/auth/dto/request/register-invite.dto.ts
import { IsString, MinLength, MaxLength, IsOptional } from 'class-validator';

export class RegisterInviteDto {
  @IsString()
  @MinLength(10)
  @MaxLength(128)
  token: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  lastName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  phone?: string;
}
