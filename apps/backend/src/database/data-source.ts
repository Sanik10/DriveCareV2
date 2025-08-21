import { DataSource } from 'typeorm';
import { config } from 'dotenv';

// 🔧 Load environment variables
config({ path: '../../.env' });

/**
 * 🗄️ DATA SOURCE для TypeORM CLI (migrations)
 * Используется ТОЛЬКО для создания и запуска migrations
 */
export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5433'),
  username: process.env.POSTGRES_USERNAME || 'postgres',
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DATABASE || 'drivecare',
  
  // 🗂️ Entities и migrations
  entities: ['src/database/entities/*.entity.ts'],
  migrations: ['src/database/migrations/*.ts'],
  
  // 🔒 SECURITY: Никогда synchronize в данных миграций
  synchronize: false,
  
  // 🔍 Минимальное логирование
  logging: ['error', 'migration'],
  
  // 📁 Migration settings
  migrationsTableName: 'migrations_history',
  migrationsRun: false, // Не запускаем автоматически
});
