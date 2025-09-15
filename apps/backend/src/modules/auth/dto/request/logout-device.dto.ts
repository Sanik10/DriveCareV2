// path: apps/backend/src/modules/auth/dto/request/logout-device.dto.ts
import { IsNotEmpty, IsString } from 'class-validator';

export class LogoutDeviceDto {
  @IsNotEmpty()
  @IsString()
  deviceId: string;
}