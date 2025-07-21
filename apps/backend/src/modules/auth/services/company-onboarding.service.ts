import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
  ) {}

  async createCompanyWithOwner(registerDto: RegisterCompanyDto): Promise<RegisterCompanyResponseDto> {
    // Проверяем, что пользователь с таким email не существует
    const existingUser = await this.usersService.findByEmail(registerDto.ownerEmail);
    if (existingUser) {
      throw new UserExistsException();
    }

    // Создаём компанию
    const company = await this.createCompany(registerDto);
    
    // Создаём системные роли для компании
    const ownerRole = await this.createCompanyRoles(company.id);
    
    // Создаём владельца компании
    const owner = await this.createCompanyOwner(registerDto, company.id, ownerRole.id);

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
  }

  private async createCompany(registerDto: RegisterCompanyDto): Promise<Company> {
    const company = this.companyRepository.create({
      name: registerDto.companyName,
      legalName: registerDto.companyLegalName,
      email: registerDto.companyEmail,
      address: registerDto.companyAddress,
      phone: registerDto.companyPhone,
      isActive: true,
    });

    return this.companyRepository.save(company);
  }

  private async createCompanyRoles(companyId: string): Promise<Role> {
    // Создаём роль владельца для компании
    const ownerRole = this.roleRepository.create({
      name: AUTH_CONSTANTS.SYSTEM_ROLES.OWNER,
      description: 'Владелец компании - полный доступ',
      isSystem: true,
      companyId,
    });

    const savedOwnerRole = await this.roleRepository.save(ownerRole);

    // Создаём остальные роли для компании
    const roles = [
      {
        name: AUTH_CONSTANTS.SYSTEM_ROLES.ADMIN,
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
        name: AUTH_CONSTANTS.SYSTEM_ROLES.MECHANIC,
        description: 'Механик - выполнение работ и учёт времени',
        isSystem: true,
        companyId,
      },
    ];

    for (const roleData of roles) {
      const role = this.roleRepository.create(roleData);
      await this.roleRepository.save(role);
    }

    return savedOwnerRole;
  }

  private async createCompanyOwner(registerDto: RegisterCompanyDto, companyId: string, ownerRoleId: string): Promise<User> {
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

  async findCompanyRoles(companyId: string): Promise<Role[]> {
    return this.roleRepository.find({
      where: { 
        companyId,
        isSystem: true 
      }
    });
  }

  async findRoleByNameAndCompany(roleName: string, companyId: string): Promise<Role | null> {
    return this.roleRepository.findOne({
      where: { 
        name: roleName,
        companyId 
      }
    });
  }
}