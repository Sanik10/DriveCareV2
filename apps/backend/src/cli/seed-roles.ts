// path: apps/backend/src/cli/seed-roles.ts
/* eslint-disable no-console */
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { DataSource } from 'typeorm';
import { Role } from '../database/entities/role.entity';
import { Company } from '../database/entities/company.entity';

async function ensureSystemRoles(ds: DataSource) {
  const rolesRepo = ds.getRepository(Role);

  const systemRoles = ['superadmin', 'platform_admin', 'support_engineer', 'system_operator', 'auditor'];

  // Вставляем пачкой, игнорируя дубликаты на уровне БД
  await rolesRepo
    .createQueryBuilder()
    .insert()
    .into(Role)
    .values(systemRoles.map((name) => ({ name, description: name, isSystem: true, companyId: null })))
    .orIgnore()
    .execute();

  console.log(`✓ System roles ensured (${systemRoles.length})`);
}

async function ensureCompanyRolesForAllCompanies(ds: DataSource) {
  const rolesRepo = ds.getRepository(Role);
  const companiesRepo = ds.getRepository(Company);

  const companyRoles = [
    'company_owner',
    'company_admin',
    'manager',
    'lead_mechanic',
    'service_advisor',
    'diagnostic',
    'inventory_manager',
    'cashier',
    'mechanic',
    'viewer',
  ];

  const companies = await companiesRepo.find();
  if (companies.length === 0) {
    console.log('ℹ No companies found. Company-level roles will be created on-demand per company (e.g., via /users/roles).');
    return;
  }

  for (const c of companies) {
    // Вставляем только отсутствующие роли для компании, игнорируя конфликты
    await rolesRepo
      .createQueryBuilder()
      .insert()
      .into(Role)
      .values(companyRoles.map((name) => ({ name, description: name, isSystem: false, companyId: c.id })))
      .orIgnore()
      .execute();

    console.log(`✓ Company roles ensured for company=${c.id} (upserted)`);
  }
}

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'error', 'warn'],
  });

  try {
    const ds = app.get(DataSource);
    await ensureSystemRoles(ds);
    await ensureCompanyRolesForAllCompanies(ds);
    console.log('✅ Roles seeding completed.');
  } catch (err) {
    console.error('❌ Roles seeding failed:', err);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

bootstrap();
