import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const getDatabaseConfig = (configService: ConfigService): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: configService.get('POSTGRES_HOST', 'localhost'),
  port: configService.get('POSTGRES_PORT', 5433),
  username: configService.get('POSTGRES_USERNAME', 'postgres'),
  password: configService.get('POSTGRES_PASSWORD'),
  database: configService.get('POSTGRES_DATABASE', 'drivecare'),
  entities: [__dirname + '/entities/*.entity{.ts,.js}'],
  synchronize: configService.get('NODE_ENV') === 'development',
  logging: configService.get('NODE_ENV') === 'development' ? ['error'] : false,
});
