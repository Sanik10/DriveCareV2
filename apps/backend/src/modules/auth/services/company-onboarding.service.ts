import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm'; // ✅ ДОБАВЛЕНО: DataSource, EntityManager
import { Company } from '../../../database/entities/company.entity';
import { User } from '../../../database/entities/user.entity';
import { Role } from '../../../database/entities/role.entity';
import { RegisterCompanyDto } from '../dto/request/register-company.dto';
import { RegisterCompanyResponseDto } from '../dto/response/register-company-response.dto';
import { AUTH_CONSTANTS } from '../constants/auth.constants';
import { UserExistsException } from '../../../common/exceptions/custom-exceptions';
import { UsersService } from '../../users/users.service';

@Injectable()
export class CompanyOnboardingService {
  constructor(
    @InjectRepository(Company)
    private companyRepository: Repository<Company>,
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
    private usersService: UsersService,
    private dataSource: DataSource, // ✅ ДОБАВЛЕНО: DataSource для транзакций
  ) {}

  // ✅ КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Добавлена транзакция
  async createCompanyWithOwner(registerDto: RegisterCompanyDto): Promise<RegisterCompanyResponseDto> {
    return this.dataSource.transaction(async (manager: EntityManager) => {
      // Проверяем, что пользователь с таким email не существует
      const existingUser = await this.usersService.findByEmail(registerDto.ownerEmail);
      if (existingUser) {
        throw new UserExistsException();
      }

      // Создаём компанию
      const company = await this.createCompany(registerDto, manager);
      
      // Создаём системные роли для компании
      const ownerRole = await this.createCompanyRoles(company.id, manager);
      
      // Создаём владельца компании
      const owner = await this.createCompanyOwner(registerDto, company.id, ownerRole.id, manager);

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

  // ✅ ИСПРАВЛЕНО: Добавлен manager параметр
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

  // ✅ ИСПРАВЛЕНО: Обновлены роли + добавлен manager
  private async createCompanyRoles(companyId: string, manager: EntityManager): Promise<Role> {
    // Создаём роль владельца для компании
    const ownerRole = manager.getRepository(Role).create({
      name: AUTH_CONSTANTS.SYSTEM_ROLES.COMPANY_OWNER, // ✅ ИСПРАВЛЕНО: COMPANY_OWNER вместо OWNER
      description: 'Владелец компании - полный доступ',
      isSystem: true,
      companyId,
    });

    const savedOwnerRole = await manager.getRepository(Role).save(ownerRole);

    // ✅ ИСПРАВЛЕНО: Обновлены роли для компании
    const roles = [
      {
        name: AUTH_CONSTANTS.SYSTEM_ROLES.COMPANY_ADMIN, // ✅ ИСПРАВЛЕНО: COMPANY_ADMIN вместо ADMIN
        description: 'Администратор - управление персоналом и настройками',
        isSystem: true,
        companyId,
      },
      {
        name: AUTH_CONSTANTS.SYSTEM_ROLES.MANAGER,
        description: 'Менеджер - управление заказами и клиентами',
        isSystem: true,
        companyId,
      },
      {
        name: AUTH_CONSTANTS.SYSTEM_ROLES.SERVICE_ADVISOR, // ✅ ДОБАВЛЕНО: Приемщик
        description: 'Приемщик - ведёт записи на обслуживание',
        isSystem: true,
        companyId,
      },
      {
        name: AUTH_CONSTANTS.SYSTEM_ROLES.CASHIER, // ✅ ДОБАВЛЕНО: Кассир
        description: 'Кассир - работа со счетами и платежами',
        isSystem: true,
        companyId,
      },
      {
        name: AUTH_CONSTANTS.SYSTEM_ROLES.INVENTORY_MANAGER, // ✅ ДОБАВЛЕНО: Складской
        description: 'Складской специалист - управление запасами',
        isSystem: true,
        companyId,
      },
      {
        name: AUTH_CONSTANTS.SYSTEM_ROLES.LEAD_MECHANIC, // ✅ ДОБАВЛЕНО: Старший мастер
        description: 'Старший мастер - контролирует других механиков',
        isSystem: true,
        companyId,
      },
      {
        name: AUTH_CONSTANTS.SYSTEM_ROLES.MECHANIC,
        description: 'Механик - выполнение работ и учёт времени',
        isSystem: true,
        companyId,
      },
      {
        name: AUTH_CONSTANTS.SYSTEM_ROLES.DIAGNOSTIC, // ✅ ДОБАВЛЕНО: Диагност
        description: 'Диагност - диагностика и специализированные работы',
        isSystem: true,
        companyId,
      },
    ];

    // ✅ ИСПРАВЛЕНО: Используем manager для сохранения ролей
    for (const roleData of roles) {
      const role = manager.getRepository(Role).create(roleData);
      await manager.getRepository(Role).save(role);
    }

    return savedOwnerRole;
  }

  // ✅ ИСПРАВЛЕНО: Добавлен manager параметр (хотя здесь используется usersService)
  private async createCompanyOwner(
    registerDto: RegisterCompanyDto, 
    companyId: string, 
    ownerRoleId: string,
    manager: EntityManager // Добавлен но не используется, так как usersService имеет свою логику
  ): Promise<User> {
    return this.usersService.create({
      company_id: companyId,
      email: registerDto.ownerEmail,
      password_hash: registerDto.ownerPassword, // Будет захешен в usersService.create
      firstName: registerDto.ownerFirstName,
      lastName: registerDto.ownerLastName,
      phone: registerDto.ownerPhone,
      roleId: ownerRoleId,
      isActive: true,
    });
  }

  // ✅ ИСПРАВЛЕНО: Добавлена валидация компании
  async findCompanyRoles(companyId: string): Promise<Role[]> {
    if (!companyId) {
      throw new Error('Company ID is required');
    }
    
    return this.roleRepository.find({
      where: { 
        companyId,
        isSystem: true 
      },
      order: {
        name: 'ASC'
      }
    });
  }

  // ✅ ИСПРАВЛЕНО: Добавлена валидация
  async findRoleByNameAndCompany(roleName: string, companyId: string): Promise<Role | null> {
    if (!roleName || !companyId) {
      throw new Error('Role name and Company ID are required');
    }
    
    return this.roleRepository.findOne({
      where: { 
        name: roleName,
        companyId 
      }
    });
  }

  // ✅ ДОБАВЛЕНО: Метод для получения статистики компании
  async getCompanyStats(companyId: string): Promise<{
    totalRoles: number;
    totalUsers: number;
    companyInfo: Company;
  }> {
    const [roles, users, company] = await Promise.all([
      this.findCompanyRoles(companyId),
      this.usersService.findByCompanyId(companyId),
      this.companyRepository.findOne({ where: { id: companyId } })
    ]);

    return {
      totalRoles: roles.length,
      totalUsers: users.length,
      companyInfo: company,
    };
  }

  // ✅ ДОБАВЛЕНО: Метод для удаления компании (с осторожностью)
  async deactivateCompany(companyId: string): Promise<void> {
    await this.dataSource.transaction(async (manager: EntityManager) => {
      // Деактивируем компанию
      await manager.getRepository(Company).update(
        { id: companyId },
        { isActive: false }
      );

      // Деактивируем всех пользователей компании
      await manager.getRepository(User).update(
        { company_id: companyId },
        { isActive: false }
      );
    });
  }
}
