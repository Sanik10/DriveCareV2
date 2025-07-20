import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const getDatabaseConfig = (configService: ConfigService): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: configService.get('POSTGRES_HOST', 'localhost'),
  port: configService.get('POSTGRES_PORT', 5433),
  username: configService.get('POSTGRES_USERNAME', 'postgres'),
  password: configService.get('POSTGRES_PASSWORD', '135137'),
  database: configService.get('POSTGRES_DATABASE', 'drivecare'),
  entities: [__dirname + '/entities/*.entity{.ts,.js}'],
  synchronize: true, // Принудительно включаем
  logging: ['query', 'error', 'schema', 'warn'], // Включаем все логи
  retryAttempts: 5,
  retryDelay: 3000,
});