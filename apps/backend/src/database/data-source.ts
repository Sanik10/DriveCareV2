// path: apps/backend/src/database/data-source.ts
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { config as loadEnv } from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// 🔧 Load environment variables (try several locations)
const envCandidates = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '../..', '.env'), // repo root when cwd=apps/backend
  path.resolve(__dirname, '../../../.env'), // fallback from src/database to repo root
];

for (const p of envCandidates) {
  if (fs.existsSync(p)) {
    const loaded = loadEnv({ path: p });
    if (loaded.parsed) {
      // eslint-disable-next-line no-console
      console.log(`🧩 Loaded env from: ${p}`);
      break;
    }
  }
}

/**
 * 🗄️ DATA SOURCE для TypeORM CLI (migrations)
 * Используется ТОЛЬКО для создания и запуска migrations
 */
const url = process.env.DATABASE_URL;

// Кросс-окружные глобы: ищем сущности во всей src (из папки database)
const entitiesGlob = path.resolve(__dirname, '..', '**', '*.entity.{ts,js}');
const migrationsGlob = path.resolve(__dirname, 'migrations', '*.{ts,js}');

const dataSource = new DataSource({
  type: 'postgres',
  ...(url
    ? { url }
    : {
        host: process.env.POSTGRES_HOST || 'localhost',
        port: parseInt(process.env.POSTGRES_PORT || '5433', 10),
        username: process.env.POSTGRES_USERNAME || 'postgres',
        password: process.env.POSTGRES_PASSWORD,
        database: process.env.POSTGRES_DATABASE || 'drivecare',
      }),
  entities: [entitiesGlob],
  migrations: [migrationsGlob],

  // Безопасность: никаких synchronize в CLI-конфиге
  synchronize: false,

  // Логирование CLI
  logging: ['error', 'migration'],

  // Таблица миграций
  migrationsTableName: 'migrations_history',
  migrationsRun: false,
});

// Важно: экспорт только один (default), как требует CLI
export default dataSource;
