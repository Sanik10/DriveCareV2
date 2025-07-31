import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppService {
  constructor(private readonly configService: ConfigService) {}

  getHello(): string {
    const version = this.configService.get('APP_VERSION', '2.0');
    const appName = this.configService.get('SWAGGER_TITLE', 'DriveCare API');
    return `🚀 ${appName} v${version} - Ready to serve!`;
  }
}
