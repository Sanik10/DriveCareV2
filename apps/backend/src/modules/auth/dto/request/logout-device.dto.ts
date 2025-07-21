import { IsNotEmpty, IsString } from 'class-validator';

export class LogoutDeviceDto {
  @IsNotEmpty()
  @IsString()
  deviceId: string;
}