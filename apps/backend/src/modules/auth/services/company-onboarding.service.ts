// path: apps/backend/src/modules/auth/services/company-onboarding.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import { Company } from '../../../database/entities/company.entity';
import { User } from '../../../database/entities/user.entity';
import { Role } from '../../../database/entities/role.entity';
import { RegisterCompanyDto } from '../dto/request/register-company.dto';
import { RegisterCompanyResponseDto } from '../dto/response/register-company-response.dto';
import { AUTH_CONSTANTS } from '../constants/auth.constants';
import { UserExistsException } from '../../../common/exceptions/custom-exceptions';
import { UsersService } from '../../users/users.service';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';

@Injectable()
export class CompanyOnboardingService {
  constructor(
    @InjectRepository(Company)
    private companyRepository: Repository<Company>,
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
    private usersService: UsersService,
    private dataSource: DataSource,
    private config: ConfigService, // ✅ для хеширования паролей
  ) {}

  async createCompanyWithOwner(registerDto: RegisterCompanyDto): Promise<RegisterCompanyResponseDto> {
    return this.dataSource.transaction(async (manager: EntityManager) => {
      // Проверяем, что пользователь с таким email не существует
      const existingUser = await manager.getRepository(User).findOne({
        where: { email: this.normalizeEmail(registerDto.ownerEmail) }
      });
      if (existingUser) {
        throw new UserExistsException();
      }

      // Создаём компанию
      const company = await this.createCompany(registerDto, manager);

      // Создаём базовые роли для компании
      const ownerRole = await this.createCompanyRoles(company.id, manager);

      // Создаём владельца ВНУТРИ транзакции
      const owner = await this.createCompanyOwnerInTransaction(registerDto, company.id, ownerRole.id, manager);

      return {
        company: {
          id: company.id,
          name: company.name,
          email: company.email,
        },
        owner: {
          id: owner.id,
          email: owner.email,
          firstName: owner.firstName,
          lastName: owner.lastName,
        },
        message: 'Компания и владелец успешно созданы'
      };
    });
  }

  private async createCompany(registerDto: RegisterCompanyDto, manager: EntityManager): Promise<Company> {
    const company = manager.getRepository(Company).create({
      name: registerDto.companyName,
      legalName: registerDto.companyLegalName,
      email: registerDto.companyEmail,
      address: registerDto.companyAddress,
      phone: registerDto.companyPhone,
      isActive: true,
    });

    return manager.getRepository(Company).save(company);
  }

  private async createCompanyRoles(companyId: string, manager: EntityManager): Promise<Role> {
    // Создаём роль владельца для компании
    const ownerRole = manager.getRepository(Role).create({
      name: AUTH_CONSTANTS.SYSTEM_ROLES.COMPANY_OWNER,
      description: 'Владелец компании - полный доступ',
      isSystem: false, // <= роли компании НЕ системные
      companyId,
    });

    const savedOwnerRole = await manager.getRepository(Role).save(ownerRole);

    // Создаем остальные роли для компании
    const roles = [
      {
        name: AUTH_CONSTANTS.SYSTEM_ROLES.COMPANY_ADMIN,
        description: 'Администратор - управление персоналом и настройками',
        isSystem: false,
        companyId,
      },
      {
        name: AUTH_CONSTANTS.SYSTEM_ROLES.MANAGER,
        description: 'Менеджер - управление заказами и клиентами',
        isSystem: false,
        companyId,
      },
      {
        name: AUTH_CONSTANTS.SYSTEM_ROLES.SERVICE_ADVISOR,
        description: 'Приемщик - ведёт записи на обслуживание',
        isSystem: false,
        companyId,
      },
      {
        name: AUTH_CONSTANTS.SYSTEM_ROLES.CASHIER,
        description: 'Кассир - работа со счетами и платежами',
        isSystem: false,
        companyId,
      },
      {
        name: AUTH_CONSTANTS.SYSTEM_ROLES.INVENTORY_MANAGER,
        description: 'Складской специалист - управление запасами',
        isSystem: false,
        companyId,
      },
      {
        name: AUTH_CONSTANTS.SYSTEM_ROLES.LEAD_MECHANIC,
        description: 'Старший мастер - контролирует других механиков',
        isSystem: false,
        companyId,
      },
      {
        name: AUTH_CONSTANTS.SYSTEM_ROLES.MECHANIC,
        description: 'Механик - выполнение работ и учёт времени',
        isSystem: false,
        companyId,
      },
      {
        name: AUTH_CONSTANTS.SYSTEM_ROLES.DIAGNOSTIC,
        description: 'Диагност - диагностика и специализированные работы',
        isSystem: false,
        companyId,
      },
      {
        name: 'viewer',
        description: 'Просмотр данных без права изменения',
        isSystem: false,
        companyId,
      },
    ];

    for (const roleData of roles) {
      const role = manager.getRepository(Role).create(roleData);
      await manager.getRepository(Role).save(role);
    }

    return savedOwnerRole;
  }

  // Создание пользователя внутри транзакции
  private async createCompanyOwnerInTransaction(
    registerDto: RegisterCompanyDto,
    companyId: string,
    ownerRoleId: string,
    manager: EntityManager
  ): Promise<User> {
    // Хешируем пароль так же, как в UsersService
    const hashedPassword = await this.hashPassword(registerDto.ownerPassword);

    const owner = manager.getRepository(User).create({
      company_id: companyId,
      email: this.normalizeEmail(registerDto.ownerEmail),
      password_hash: hashedPassword,
      firstName: registerDto.ownerFirstName,
      lastName: registerDto.ownerLastName,
      phone: registerDto.ownerPhone || null,
      roleId: ownerRoleId,
      isActive: true,
    });

    return manager.getRepository(User).save(owner);
  }

  private async hashPassword(password: string): Promise<string> {
    const pepper = this.config.get<string>('PWD_PEPPER', '');
    return argon2.hash(`${password}${pepper}`, {
      type: argon2.argon2id,
      memoryCost: 19456, // ~19MB
      timeCost: 2,
      parallelism: 1,
    });
  }

  private normalizeEmail(email: string): string {
    return (email || '').trim().toLowerCase();
  }

  async findCompanyRoles(companyId: string): Promise<Role[]> {
    if (!companyId) {
      throw new Error('Company ID is required');
    }

    return this.roleRepository.find({
      where: {
        companyId,
        isSystem: false, // <= роли компании
      },
      order: {
        name: 'ASC',
      },
    });
  }

  async findRoleByNameAndCompany(roleName: string, companyId: string): Promise<Role | null> {
    if (!roleName || !companyId) {
      throw new Error('Role name and Company ID are required');
    }

    return this.roleRepository.findOne({
      where: {
        name: roleName,
        companyId,
      },
    });
  }

  async getCompanyStats(companyId: string): Promise<{
    totalRoles: number;
    totalUsers: number;
    companyInfo: Company;
  }> {
    const [roles, users, company] = await Promise.all([
      this.findCompanyRoles(companyId),
      this.usersService.findByCompanyId(companyId),
      this.companyRepository.findOne({ where: { id: companyId } }),
    ]);

    return {
      totalRoles: roles.length,
      totalUsers: users.length,
      companyInfo: company!,
    };
  }

  async deactivateCompany(companyId: string): Promise<void> {
    await this.dataSource.transaction(async (manager: EntityManager) => {
      // Деактивируем компанию
      await manager.getRepository(Company).update({ id: companyId }, { isActive: false });

      // Деактивируем всех пользователей компании
      await manager.getRepository(User).update({ company_id: companyId }, { isActive: false });
    });
  }
}
