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
import * as bcrypt from 'bcrypt';
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

  /**
   * В dev/staging гарантируем схему перед сидом:
   * - если базовые таблицы отсутствуют — вызываем synchronize()
   */
  private async ensureSchema(): Promise<void> {
    const env = this.configService.get<string>('NODE_ENV', 'development');

    if (env === 'production') return;

    const runner = this.dataSource.createQueryRunner();
    try {
      await runner.connect();

      const exists = async (table: string) => {
        const res = await runner.query(`SELECT to_regclass($1) AS name`, [`public.${table}`]);
        return !!res?.[0]?.name;
        // to_regclass returns table name or null
      };

      // Минимальный набор для сидов
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
      // не падаем — дадим сидерам попытаться (но, скорее всего, упадут с понятной ошибкой)
    } finally {
      await runner.release();
    }
  }

  /**
   * 🛡️ SECURITY: Environment-specific seeding с полной защитой
   * Запускается ТОЛЬКО в development/staging environments
   */
  async runAllSeeds(): Promise<void> {
    const environment = this.configService.get('NODE_ENV', 'development');

    // 🚨 CRITICAL SECURITY: Блокируем выполнение в production
    if (environment === 'production') {
      this.logger.warn('🚫 Seeds are disabled in production environment for security');
      await this.auditService.log(AuditAction.SEEDS_BLOCKED_IN_PRODUCTION, {
        environment,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // 🔒 SECURITY: Дополнительная проверка для staging
    if (environment === 'staging') {
      const allowStagingSeeds = this.configService.get('ALLOW_STAGING_SEEDS', 'false');
      if (allowStagingSeeds !== 'true') {
        this.logger.warn('🚫 Seeds are disabled in staging. Set ALLOW_STAGING_SEEDS=true to enable');
        return;
      }
    }

    // ⛑️ Гарантируем схему до любых операций/логирования
    await this.ensureSchema();

    this.logger.log(`🌱 Starting database seeding in ${environment} environment...`);

    try {
      const startTime = Date.now();

      await this.createSuperadminRole();
      await this.createSuperadmin();

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

  /**
   * 🛡️ SECURITY: Создание роли superadmin с enhanced validation
   */
  private async createSuperadminRole(): Promise<Role> {
    const existingRole = await this.rolesRepository.findOne({
      where: { name: 'superadmin' },
    });

    if (existingRole) {
      this.logger.log('👑 Superadmin role already exists, skipping creation...');
      return existingRole;
    }

    const superadminRole = this.rolesRepository.create({
      name: 'superadmin',
      description: 'Системный администратор - полный доступ ко всем функциям системы',
      isSystem: true,
      companyId: null,
    });

    const savedRole = await this.rolesRepository.save(superadminRole);
    this.logger.log('✅ Superadmin role created successfully');

    await this.auditService.log(AuditAction.SUPERADMIN_ROLE_CREATED, {
      roleId: savedRole.id,
      roleName: savedRole.name,
      timestamp: new Date().toISOString(),
    });

    return savedRole;
  }

  /**
   * 🛡️ SECURITY: Создание superadmin с enterprise-grade security
   */
  private async createSuperadmin(): Promise<void> {
    const superadminEmail = 'superadmin@drivecare.com';

    const existingSuperadmin = await this.usersRepository.findOne({
      where: { email: superadminEmail },
    });

    if (existingSuperadmin) {
      this.logger.log('👑 Superadmin user already exists, skipping creation...');
      return;
    }

    // 🔍 Получаем роль superadmin
    const superadminRole = await this.rolesRepository.findOne({
      where: { name: 'superadmin' },
    });

    if (!superadminRole) {
      const error = new Error('Superadmin role not found - cannot create superadmin user');
      await this.auditService.log(AuditAction.SUPERADMIN_CREATION_FAILED, {
        reason: 'role_not_found',
        email: superadminEmail,
        timestamp: new Date().toISOString(),
      });
      throw error;
    }

    // 🔐 ENTERPRISE SECURITY: Secure password generation
    const password = this.generateSecurePassword();
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // 👤 Создаём superadmin с enhanced security
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
    } else {
      this.logger.warn('🔐 Secure password generated - check secure storage for credentials');
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
