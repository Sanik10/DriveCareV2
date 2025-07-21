import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { Role } from '../entities/role.entity';
import { Company } from '../entities/company.entity';
import * as bcrypt from 'bcrypt';

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
  ) {}

  async runAllSeeds(): Promise<void> {
    this.logger.log('🌱 Starting database seeding...');
    
    try {
      await this.createSuperadminRole();
      await this.createSuperadmin();
      
      this.logger.log('✅ Database seeding completed successfully!');
    } catch (error) {
      this.logger.error('❌ Database seeding failed:', error.message);
      throw error;
    }
  }

  private async createSuperadminRole(): Promise<Role> {
    const existingRole = await this.rolesRepository.findOne({
      where: { name: 'superadmin' }
    });

    if (existingRole) {
      this.logger.log('👑 Superadmin role already exists, skipping...');
      return existingRole;
    }

    const superadminRole = this.rolesRepository.create({
      name: 'superadmin',
      description: 'Системный администратор - полный доступ ко всем функциям',
      isSystem: true,
      companyId: null, // Superadmin не привязан к компании
    });

    const savedRole = await this.rolesRepository.save(superadminRole);
    this.logger.log('✅ Superadmin role created successfully');
    
    return savedRole;
  }

  private async createSuperadmin(): Promise<void> {
    const existingSuperadmin = await this.usersRepository.findOne({
      where: { email: 'superadmin@drivecare.com' }
    });

    if (existingSuperadmin) {
      this.logger.log('👑 Superadmin user already exists, skipping...');
      return;
    }

    // Получаем роль superadmin
    const superadminRole = await this.rolesRepository.findOne({
      where: { name: 'superadmin' }
    });

    if (!superadminRole) {
      throw new Error('Superadmin role not found');
    }

    // Хешируем пароль
    const password = 'secure_password654321!';
    const hashedPassword = await bcrypt.hash(password, 10);

    // Создаём суперадмина
    const superadmin = this.usersRepository.create({
      email: 'superadmin@drivecare.com',
      password_hash: hashedPassword,
      firstName: 'System',
      lastName: 'Administrator',
      phone: null,
      isActive: true,
      roleId: superadminRole.id,
      company_id: null, // Superadmin не привязан к компании
    });

    await this.usersRepository.save(superadmin);

    this.logger.log('✅ Superadmin user created successfully');
    this.logger.log('📧 Email: superadmin@drivecare.com');
    this.logger.log('🔑 Password: secure_password654321!');
    this.logger.warn('⚠️  IMPORTANT: Change this password in production!');
  }

  async checkSuperadminExists(): Promise<boolean> {
    const superadmin = await this.usersRepository.findOne({
      where: { email: 'superadmin@drivecare.com' },
      relations: ['role']
    });

    return !!superadmin;
  }

  async getSuperadminInfo(): Promise<any> {
    const superadmin = await this.usersRepository.findOne({
      where: { email: 'superadmin@drivecare.com' },
      relations: ['role'],
      select: ['id', 'email', 'firstName', 'lastName', 'isActive', 'createdAt']
    });

    return superadmin;
  }
}