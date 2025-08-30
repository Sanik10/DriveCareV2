// path: apps/backend/src/modules/users/users.service.ts
import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { User } from '../../database/entities/user.entity';
import { Role } from '../../database/entities/role.entity';
import { CreateUserDto } from './dto/request/create-user.dto';
import { UserResponseDto } from './dto/response/user-response.dto';
import { PaginatedUsersResponseDto } from './dto/response/paginated-users-response.dto';
import { AuthRole } from '../auth/types/auth.types';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Role)
    private rolesRepository: Repository<Role>,
    private dataSource: DataSource,
    private config: ConfigService,
  ) {}

  private normalizeEmail(email: string): string {
    return (email || '').trim().toLowerCase();
  }

  private isBcryptHash(hash: string): boolean {
    return typeof hash === 'string' && hash.startsWith('$2');
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { email: this.normalizeEmail(email) },
      relations: ['role'],
    });
  }

  // with2FA: добавить twoFactorSecret в выборку при необходимости
  async findById(id: string, opts?: { with2FA?: boolean }): Promise<User> {
    const qb = this.usersRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.role', 'role')
      .where('user.id = :id', { id });

    if (opts?.with2FA) {
      qb.addSelect('user.twoFactorSecret'); // колонка select: false в entity
    }

    const user = await qb.getOne();
    if (!user) throw new NotFoundException(`User with ID ${id} not found`);
    return user;
  }

  async findAll(companyId?: string): Promise<User[]> {
    const where = companyId ? { company_id: companyId } : {};
    return this.usersRepository.find({ where, relations: ['role'] });
  }

  async findByCompanyId(companyId: string): Promise<User[]> {
    return this.usersRepository.find({ where: { company_id: companyId }, relations: ['role'] });
  }

  async create(userData: Partial<User>): Promise<User> {
    // нормализуем email
    if (userData.email) userData.email = this.normalizeEmail(userData.email);

    const role = await this.rolesRepository.findOne({ where: { id: userData.roleId } });
    if (!role) throw new NotFoundException(`Role with ID ${userData.roleId} not found`);
    if (role.companyId !== userData.company_id && role.companyId !== null) {
      throw new ForbiddenException('Cannot assign role from another company');
    }

    if (userData.password_hash) {
      userData.password_hash = await this.hashPassword(userData.password_hash);
    }

    const newUser = this.usersRepository.create(userData);
    return this.usersRepository.save(newUser);
  }

  // Пароль: argon2id + pepper
  async hashPassword(password: string): Promise<string> {
    const pepper = this.config.get<string>('PWD_PEPPER', '');
    return argon2.hash(`${password}${pepper}`, {
      type: argon2.argon2id,
      memoryCost: 19456, // ~19MB
      timeCost: 2,
      parallelism: 1,
    });
  }

  async comparePasswords(plainPassword: string, hashedPassword: string): Promise<boolean> {
    const pepper = this.config.get<string>('PWD_PEPPER', '');
    try {
      // Обратная совместимость для старых сидов (bcrypt без pepper)
      if (this.isBcryptHash(hashedPassword)) {
        return await bcrypt.compare(plainPassword, hashedPassword);
      }
      return await argon2.verify(hashedPassword, `${plainPassword}${pepper}`);
    } catch {
      return false;
    }
  }

  async upgradePasswordHashIfNeeded(userId: string, plainPassword: string, currentHash: string): Promise<void> {
    if (this.isBcryptHash(currentHash)) {
      const newHash = await this.hashPassword(plainPassword);
      await this.usersRepository.update({ id: userId }, { password_hash: newHash });
    }
  }

  async updateLastLogin(userId: string): Promise<void> {
    await this.usersRepository.update({ id: userId }, { lastLoginAt: new Date() });
  }

  async findActiveUsers(companyId?: string): Promise<User[]> {
    const where: any = { isActive: true };
    if (companyId) where.company_id = companyId;
    return this.usersRepository.find({ where, relations: ['role'] });
  }

  async getUserCount(companyId?: string): Promise<number> {
    const where = companyId ? { company_id: companyId } : {};
    return this.usersRepository.count({ where });
  }

  async deactivateUser(userId: string): Promise<void> {
    await this.usersRepository.update({ id: userId }, { isActive: false });
  }

  async activateUser(userId: string): Promise<void> {
    await this.usersRepository.update({ id: userId }, { isActive: true });
  }

  // 2FA: обновление полей
  async updateTwoFactor(userId: string, patch: { twoFactorEnabled?: boolean; twoFactorSecret?: string | null }) {
    await this.usersRepository.update({ id: userId }, patch);
  }

  /**
   * Создание пользователя с транзакцией и проверками
   */
  async createUserSecure(userData: CreateUserDto & { company_id: string }, currentUser: any): Promise<UserResponseDto> {
    return this.dataSource.transaction(async (manager) => {
      // нормализуем email
      const email = this.normalizeEmail(userData.email);

      const existingUser = await manager.findOne(User, { where: { email } });
      if (existingUser) {
        throw new ConflictException(`Пользователь с email ${email} уже существует`);
      }

      // roleId из role_id/roleId
      const roleId = (userData as any).roleId ?? (userData as any).role_id;
      const role = await manager.findOne(Role, { where: { id: roleId } });
      if (!role) throw new NotFoundException(`Роль с ID ${roleId} не найдена`);
      if (role.companyId !== userData.company_id && role.companyId !== null) {
        throw new ForbiddenException('Роль не принадлежит вашей компании');
      }

      this.validateRoleHierarchy(currentUser.role as AuthRole, role.name as AuthRole);

      const hashedPassword = await this.hashPassword((userData as any).password ?? (userData as any).password_hash);

      const newUser = manager.create(User, {
        email,
        password_hash: hashedPassword,
        firstName: userData.firstName,
        lastName: userData.lastName,
        phone: userData.phone,
        specialization: userData.specialization,
        company_id: userData.company_id,
        roleId,
        isActive: true,
      });

      const savedUser = await manager.save(newUser);
      const userWithRole = await manager.findOne(User, { where: { id: savedUser.id }, relations: ['role'] });
      return this.mapToResponseDto(userWithRole!);
    });
  }

  async getUsersSecure(filter: any, currentUser: any): Promise<PaginatedUsersResponseDto> {
    const qb = this.usersRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.role', 'role')
      .orderBy('user.firstName', 'ASC');

    if (currentUser.role !== 'superadmin') {
      qb.andWhere('user.company_id = :companyId', { companyId: currentUser.companyId });
    }

    if (filter.search) {
      qb.andWhere(
        '(LOWER(user.firstName) LIKE LOWER(:search) OR LOWER(user.lastName) LIKE LOWER(:search) OR LOWER(user.email) LIKE LOWER(:search))',
        { search: `%${filter.search}%` },
      );
    }

    if (filter.isActive !== undefined) {
      qb.andWhere('user.isActive = :isActive', { isActive: filter.isActive });
    }

    if (filter.role) {
      qb.andWhere('role.name = :role', { role: filter.role });
    }

    const total = await qb.getCount();
    qb.skip((filter.page - 1) * filter.limit).take(filter.limit);

    const users = await qb.getMany();
    const userDtos = users.map((u) => this.mapToResponseDto(u));
    const totalPages = Math.ceil(total / filter.limit);

    return {
      users: userDtos,
      page: filter.page,
      limit: filter.limit,
      total,
      totalPages,
      hasNext: filter.page < totalPages,
      hasPrev: filter.page > 1,
    };
  }

  async getUserByIdSecure(userId: string, currentUser: any): Promise<UserResponseDto> {
    const user = await this.usersRepository.findOne({ where: { id: userId }, relations: ['role'] });
    if (!user) throw new NotFoundException(`Пользователь с ID ${userId} не найден`);

    if (currentUser.role !== 'superadmin' && user.company_id !== currentUser.companyId) {
      throw new ForbiddenException('Пользователь принадлежит другой компании');
    }

    return this.mapToResponseDto(user);
  }

  async deleteUserSecure(userId: string, currentUser: any): Promise<void> {
    const user = await this.usersRepository.findOne({ where: { id: userId }, relations: ['role'] });
    if (!user) throw new NotFoundException(`Пользователь с ID ${userId} не найден`);

    if (currentUser.role !== 'superadmin' && user.company_id !== currentUser.companyId) {
      throw new ForbiddenException('Пользователь принадлежит другой компании');
    }
    if (userId === currentUser.id) {
      throw new ForbiddenException('Нельзя удалить самого себя');
    }

    await this.usersRepository.update(userId, { isActive: false });
  }

  private validateRoleHierarchy(assignerRole: AuthRole, targetRole: AuthRole): void {
    const hierarchy: Record<AuthRole, number> = {
      superadmin: 100,
      platform_admin: 90,
      company_owner: 70,
      company_admin: 60,
      manager: 50,
      lead_mechanic: 40,
      service_advisor: 35,
      cashier: 30,
      inventory_manager: 30,
      mechanic: 20,
      diagnostic: 20,
      auditor: 80,
      support_engineer: 80,
      system_operator: 80,
    } as any;

    const assignerLevel = hierarchy[assignerRole] ?? 0;
    const targetLevel = hierarchy[targetRole] ?? 0;
    if (assignerLevel <= targetLevel) {
      throw new ForbiddenException('Нельзя назначить роль равную или выше своей');
    }
  }

  private mapToResponseDto(user: User): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      specialization: user.specialization,
      isActive: user.isActive,
      role: { id: user.role.id, name: user.role.name },
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
    };
  }
}
