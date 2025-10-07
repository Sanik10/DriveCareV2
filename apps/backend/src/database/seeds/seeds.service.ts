// path: apps/backend/src/database/seeds/seeds.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { User } from '../entities/user.entity';
import { Role } from '../entities/role.entity';
import { Company } from '../entities/company.entity';
import { AuditService, AuditAction } from '../../common/audit/audit.service';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';

@Injectable()
export class SeedsService {
  private readonly logger = new Logger(SeedsService.name);

  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Role)
    private rolesRepository: Repository<Role>,
    @InjectRepository(Company)
    private companiesRepository: Repository<Company>,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  private async ensureSchema(): Promise<void> {
    const env = this.configService.get<string>('NODE_ENV', 'development');

    if (env === 'production') return;

    const runner = this.dataSource.createQueryRunner();
    try {
      await runner.connect();

      const exists = async (table: string) => {
        const res = await runner.query(`SELECT to_regclass($1) AS name`, [`public.${table}`]);
        return !!res?.[0]?.name;
      };

      const requiredTables = ['roles', 'users', 'companies', 'audit_logs'];
      let needSync = false;
      for (const t of requiredTables) {
        const ok = await exists(t);
        if (!ok) {
          needSync = true;
          break;
        }
      }

      if (needSync) {
        this.logger.warn('🧱 Schema missing required tables — running TypeORM synchronize() (dev/staging only)');
        await this.dataSource.synchronize();
        this.logger.log('✅ Schema synchronized successfully');
      }
    } catch (e: any) {
      this.logger.error(`Failed to check/synchronize schema: ${e?.message || e}`);
    } finally {
      await runner.release();
    }
  }

  async runAllSeeds(): Promise<void> {
    const environment = this.configService.get('NODE_ENV', 'development');

    if (environment === 'production') {
      this.logger.warn('🚫 Seeds are disabled in production environment for security');
      await this.auditService.log(AuditAction.SEEDS_BLOCKED_IN_PRODUCTION, {
        environment,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (environment === 'staging') {
      const allowStagingSeeds = this.configService.get('ALLOW_STAGING_SEEDS', 'false');
      if (allowStagingSeeds !== 'true') {
        this.logger.warn('🚫 Seeds are disabled in staging. Set ALLOW_STAGING_SEEDS=true to enable');
        return;
      }
    }

    await this.ensureSchema();

    this.logger.log(`🌱 Starting database seeding in ${environment} environment...`);

    try {
      const startTime = Date.now();

      // 1) Системные роли (включая superadmin)
      await this.ensureSystemRoles();

      // 2) Создаём супер-админа (если ещё нет)
      await this.createSuperadmin();

      // 3) Базовые роли для всех существующих компаний (идемпотентно)
      await this.ensureCompanyRolesForAllCompanies();

      const duration = Date.now() - startTime;
      this.logger.log(`✅ Database seeding completed successfully in ${duration}ms`);

      await this.auditService.log(AuditAction.SEEDS_COMPLETED, {
        environment,
        duration,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      this.logger.error('❌ Database seeding failed:', error.message);

      await this.auditService.log(AuditAction.SEEDS_FAILED, {
        environment,
        error: error.message,
        timestamp: new Date().toISOString(),
      });

      throw error;
    }
  }

  private async ensureSystemRoles(): Promise<void> {
    const systemRoles = ['superadmin', 'platform_admin', 'support_engineer', 'system_operator', 'auditor'];

    await this.rolesRepository
      .createQueryBuilder()
      .insert()
      .into(Role)
      .values(systemRoles.map((name) => ({ name, description: name, isSystem: true, companyId: null })))
      .orIgnore()
      .execute();

    this.logger.log('✅ System roles ensured');
  }

  private async ensureCompanyRolesForAllCompanies(): Promise<void> {
    const roles = [
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

    const companies = await this.companiesRepository.find();
    if (companies.length === 0) {
      this.logger.log('ℹ No companies found. Company-level roles will be created on-demand per company.');
      return;
    }

    for (const c of companies) {
      await this.rolesRepository
        .createQueryBuilder()
        .insert()
        .into(Role)
        .values(roles.map((name) => ({ name, description: name, isSystem: false, companyId: c.id })))
        .orIgnore()
        .execute();
    }

    this.logger.log('✅ Company roles ensured for all companies');
  }

  private async createSuperadmin(): Promise<void> {
    const superadminEmail = 'superadmin@drivecare.com';

    const existingSuperadmin = await this.usersRepository.findOne({
      where: { email: superadminEmail },
    });

    if (existingSuperadmin) {
      this.logger.log('👑 Superadmin user already exists, skipping creation...');
      return;
    }

    const superadminRole = await this.rolesRepository.findOne({
      where: { name: 'superadmin' },
    });

    if (!superadminRole) {
      throw new Error('Superadmin role not found - cannot create superadmin user');
    }

    const password = this.generateSecurePassword();
    const pepper = this.configService.get<string>('PWD_PEPPER', '');
    const hashedPassword = await argon2.hash(`${password}${pepper}`, {
      type: argon2.argon2id,
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    });

    const superadmin = this.usersRepository.create({
      email: superadminEmail,
      password_hash: hashedPassword,
      firstName: 'System',
      lastName: 'Administrator',
      phone: null,
      isActive: true,
      roleId: superadminRole.id,
      company_id: null,
    });

    const savedUser = await this.usersRepository.save(superadmin);

    this.logger.log('✅ Superadmin user created successfully');
    this.logger.log(`📧 Email: ${superadminEmail}`);

    const environment = this.configService.get('NODE_ENV');
    if (environment === 'development') {
      this.logger.warn('🔑 TEMPORARY PASSWORD (development only):');
      this.logger.warn(`🔑 ${password}`);
      this.logger.warn('⚠️  IMPORTANT: This password is auto-generated and should be changed immediately!');
      this.logger.warn('⚠️  Password is only shown in development environment');
    }

    await this.auditService.log(AuditAction.SUPERADMIN_USER_CREATED, {
      userId: savedUser.id,
      email: superadminEmail,
      roleId: superadminRole.id,
      environment,
      hasSecurePassword: true,
      timestamp: new Date().toISOString(),
    });
  }

  private generateSecurePassword(): string {
    const length = 16;
    const charset = {
      uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
      lowercase: 'abcdefghijklmnopqrstuvwxyz',
      numbers: '0123456789',
      symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?',
    };

    let password = '';
    password += this.getRandomChar(charset.uppercase);
    password += this.getRandomChar(charset.lowercase);
    password += this.getRandomChar(charset.numbers);
    password += this.getRandomChar(charset.symbols);

    const allChars = Object.values(charset).join('');
    for (let i = password.length; i < length; i++) {
      password += this.getRandomChar(allChars);
    }

    return this.shuffleString(password);
  }

  private getRandomChar(charset: string): string {
    const randomIndex = crypto.randomInt(0, charset.length);
    return charset[randomIndex];
  }

  private shuffleString(str: string): string {
    const arr = str.split('');
    for (let i = arr.length - 1; i > 0; i--) {
      const j = crypto.randomInt(0, i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr.join('');
  }

  async checkSuperadminExists(): Promise<boolean> {
    try {
      const superadmin = await this.usersRepository.findOne({
        where: {
          email: 'superadmin@drivecare.com',
          isActive: true,
        },
        relations: ['role'],
      });

      const exists = !!superadmin && superadmin.role?.name === 'superadmin';

      await this.auditService.log(AuditAction.SUPERADMIN_EXISTENCE_CHECK, {
        exists,
        timestamp: new Date().toISOString(),
      });

      return exists;
    } catch (error: any) {
      this.logger.error('Error checking superadmin existence:', error.message);
      return false;
    }
  }

  async getSuperadminInfo(): Promise<any> {
    try {
      const superadmin = await this.usersRepository.findOne({
        where: {
          email: 'superadmin@drivecare.com',
          isActive: true,
        },
        relations: ['role'],
        select: ['id', 'email', 'firstName', 'lastName', 'isActive', 'createdAt'],
      });

      if (!superadmin) {
        return null;
      }

      return {
        id: superadmin.id,
        email: superadmin.email,
        firstName: superadmin.firstName,
        lastName: superadmin.lastName,
        isActive: superadmin.isActive,
        role: superadmin.role ? { name: superadmin.role.name } : null,
        createdAt: superadmin.createdAt,
      };
    } catch (error: any) {
      this.logger.error('Error retrieving superadmin info:', error.message);
      return null;
    }
  }
}
