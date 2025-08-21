import { Injectable, NotFoundException, ConflictException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';

import { User } from '../../../database/entities/user.entity';
import { Role } from '../../../database/entities/role.entity';
import { CreateUserDto } from '../dto/request/create-user.dto';
import { UpdateUserProfileDto } from '../dto/request/update-user-profile.dto';
import { UserFilter } from '../types/users.types';
import { USERS_CONSTANTS } from '../constants/users.constants';

@Injectable()
export class UsersDataService {
  constructor(
    @InjectRepository(User) private usersRepository: Repository<User>,
    @InjectRepository(Role) private rolesRepository: Repository<Role>,
    private dataSource: DataSource,
    private config: ConfigService,
  ) {}

  async createUserWithTransaction(userData: CreateUserDto & { company_id: string }): Promise<User> {
    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      const existingUser = await qr.manager
        .createQueryBuilder(User, 'user')
        .where('LOWER(user.email) = LOWER(:email)', { email: userData.email })
        .setLock('pessimistic_write')
        .getOne();
      if (existingUser) throw new ConflictException(`Пользователь с email ${userData.email} уже существует`);

      const role = await qr.manager.findOne(Role, { where: { id: userData.role_id }, select: ['id', 'name', 'companyId', 'isSystem'] });
      if (!role) throw new NotFoundException(`Роль с ID ${userData.role_id} не найдена`);

      const password_hash = await this.hashPassword(userData.password);

      const newUser = qr.manager.create(User, {
        company_id: userData.company_id,
        email: userData.email.toLowerCase().trim(),
        password_hash,
        firstName: userData.firstName.trim(),
        lastName: userData.lastName.trim(),
        phone: userData.phone ? this.normalizePhone(userData.phone) : null,
        specialization: userData.specialization?.trim() || null,
        roleId: userData.role_id,
        isActive: true,
        lastLoginAt: null,
      });

      const savedUser = await qr.manager.save(User, newUser);
      const userWithRole = await qr.manager.findOne(User, {
        where: { id: savedUser.id },
        relations: ['role'],
        select: {
          id: true, company_id: true, email: true, firstName: true, lastName: true,
          phone: true, specialization: true, isActive: true, lastLoginAt: true, createdAt: true, updatedAt: true,
          role: { id: true, name: true },
        },
      });

      await qr.commitTransaction();
      return userWithRole!;
    } catch (error) {
      await qr.rollbackTransaction();
      if (error instanceof ConflictException || error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Ошибка при создании пользователя. Попробуйте позже.');
    } finally {
      await qr.release();
    }
  }

  async findUsersWithFilter(filter: UserFilter): Promise<{ users: User[]; total: number }> {
    const qb = this.usersRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.role', 'role')
      .select([
        'user.id', 'user.email', 'user.firstName', 'user.lastName', 'user.phone',
        'user.specialization', 'user.isActive', 'user.lastLoginAt', 'user.createdAt',
        'role.id', 'role.name',
      ]);

    if (filter.companyId) qb.andWhere('user.company_id = :companyId', { companyId: filter.companyId });

    if (filter.search?.trim()) {
      const searchTerm = `%${filter.search.trim().toLowerCase()}%`;
      qb.andWhere('(LOWER(user.firstName) LIKE :s OR LOWER(user.lastName) LIKE :s OR LOWER(user.email) LIKE :s)', { s: searchTerm });
    }

    if (typeof filter.isActive === 'boolean') qb.andWhere('user.isActive = :isActive', { isActive: filter.isActive });
    if (filter.role?.trim()) qb.andWhere('role.name = :role', { role: filter.role.trim() });

    const allowedSortFields = ['firstName', 'lastName', 'email', 'createdAt', 'lastLoginAt'];
    const sortField = allowedSortFields.includes(filter.sortField || '') ? filter.sortField! : 'createdAt';
    const sortOrder = (filter.sortOrder || 'DESC') as 'ASC' | 'DESC';
    qb.orderBy(`user.${sortField}`, sortOrder);

    const total = await qb.getCount();

    const page = Math.max(1, filter.page);
    const limit = Math.min(Math.max(1, filter.limit), USERS_CONSTANTS.PAGINATION.MAX_LIMIT);
    qb.skip((page - 1) * limit).take(limit);

    const users = await qb.getMany();
    return { users, total };
  }

  async findByIdWithRole(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: ['role'],
      select: {
        id: true, company_id: true, email: true, firstName: true, lastName: true,
        phone: true, specialization: true, isActive: true, lastLoginAt: true, createdAt: true, updatedAt: true,
        role: { id: true, name: true },
      },
    });
    if (!user) throw new NotFoundException(`Пользователь с ID ${id} не найден`);
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.role', 'role')
      .where('LOWER(user.email) = LOWER(:email)', { email: email.trim() })
      .select([
        'user.id', 'user.company_id', 'user.email', 'user.password_hash',
        'user.firstName', 'user.lastName', 'user.phone', 'user.specialization',
        'user.isActive', 'user.lastLoginAt', 'user.createdAt',
        'role.id', 'role.name',
      ])
      .getOne();
  }

  async updateUserWithTransaction(id: string, updateData: UpdateUserProfileDto): Promise<User> {
    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      if (updateData.email) {
        const existingUser = await qr.manager
          .createQueryBuilder(User, 'user')
          .where('LOWER(user.email) = LOWER(:email)', { email: updateData.email })
          .andWhere('user.id != :id', { id })
          .setLock('pessimistic_write')
          .getOne();
        if (existingUser) throw new ConflictException(`Email ${updateData.email} уже используется другим пользователем`);
      }

      const patch: Partial<User> = {};
      if (updateData.email) patch.email = updateData.email.toLowerCase().trim();
      if (updateData.firstName) patch.firstName = updateData.firstName.trim();
      if (updateData.lastName) patch.lastName = updateData.lastName.trim();
      if (updateData.phone) patch.phone = this.normalizePhone(updateData.phone);
      if (updateData.specialization !== undefined) patch.specialization = updateData.specialization?.trim() || null;

      await qr.manager.update(User, id, patch);

      const updated = await qr.manager.findOne(User, {
        where: { id },
        relations: ['role'],
        select: {
          id: true, company_id: true, email: true, firstName: true, lastName: true,
          phone: true, specialization: true, isActive: true, lastLoginAt: true, createdAt: true, updatedAt: true,
          role: { id: true, name: true },
        },
      });

      await qr.commitTransaction();
      return updated!;
    } catch (e) {
      await qr.rollbackTransaction();
      if (e instanceof ConflictException) throw e;
      throw new InternalServerErrorException('Ошибка при обновлении пользователя. Попробуйте позже.');
    } finally {
      await qr.release();
    }
  }

  async updateUserRoleWithTransaction(userId: string, roleId: string): Promise<User> {
    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      const role = await qr.manager.findOne(Role, { where: { id: roleId }, select: ['id', 'name', 'companyId'] });
      if (!role) throw new NotFoundException(`Роль с ID ${roleId} не найдена`);

      await qr.manager.update(User, userId, { roleId, updatedAt: new Date() });

      const updated = await qr.manager.findOne(User, {
        where: { id: userId },
        relations: ['role'],
        select: {
          id: true, company_id: true, email: true, firstName: true, lastName: true,
          phone: true, specialization: true, isActive: true, lastLoginAt: true, createdAt: true, updatedAt: true,
          role: { id: true, name: true },
        },
      });

      await qr.commitTransaction();
      return updated!;
    } catch (e) {
      await qr.rollbackTransaction();
      if (e instanceof NotFoundException) throw e;
      throw new InternalServerErrorException('Ошибка при обновлении роли пользователя. Попробуйте позже.');
    } finally {
      await qr.release();
    }
  }

  async updateUserStatus(userId: string, isActive: boolean): Promise<User> {
    await this.usersRepository.update(userId, { isActive, updatedAt: new Date() });
    return this.findByIdWithRole(userId);
  }

  async updateUserPassword(userId: string, hashedPassword: string): Promise<void> {
    const res = await this.usersRepository.update(userId, { password_hash: hashedPassword, updatedAt: new Date() });
    if (res.affected === 0) throw new NotFoundException(`Пользователь с ID ${userId} не найден`);
  }

  async hashPassword(password: string): Promise<string> {
    const pepper = this.config.get<string>('PWD_PEPPER', '');
    try {
      return await argon2.hash(`${password}${pepper}`, { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 });
    } catch {
      throw new InternalServerErrorException('Ошибка при обработке пароля. Попробуйте позже.');
    }
  }

  async comparePasswords(plain: string, hash: string): Promise<boolean> {
    const pepper = this.config.get<string>('PWD_PEPPER', '');
    try { return await argon2.verify(hash, `${plain}${pepper}`); } catch { return false; }
  }

  async updateLastLogin(userId: string): Promise<void> {
    await this.usersRepository.update(userId, { lastLoginAt: new Date(), updatedAt: new Date() });
  }

  async getUserStatsForCompany(companyId: string): Promise<{ total: number; active: number; inactive: number; byRole: Record<string, number>; }> {
    const rows = await this.usersRepository
      .createQueryBuilder('user')
      .leftJoin('user.role', 'role')
      .select([
        'COUNT(*) as total',
        'COUNT(CASE WHEN user.isActive = true THEN 1 END) as active',
        'COUNT(CASE WHEN user.isActive = false THEN 1 END) as inactive',
      ])
      .addSelect('role.name', 'roleName')
      .addSelect('COUNT(role.name)', 'roleCount')
      .where('user.company_id = :companyId', { companyId })
      .groupBy('role.name')
      .getRawMany();

    const byRole: Record<string, number> = {};
    let total = 0, active = 0, inactive = 0;

    rows.forEach((r: any) => {
      byRole[r.roleName || 'unknown'] = parseInt(r.roleCount);
      total += parseInt(r.total);
      active += parseInt(r.active);
      inactive += parseInt(r.inactive);
    });

    return { total, active, inactive, byRole };
  }

  private normalizePhone(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    if (digits.startsWith('8') && digits.length === 11) return '+7' + digits.substring(1);
    if (digits.startsWith('7') && digits.length === 11) return '+' + digits;
    if (phone.startsWith('+7') && digits.length === 11) return phone;
    return phone;
  }

   /**
   * 🔐 Мягкое удаление пользователя (деактивация)
   */
  async softDeleteUser(userId: string, deletedBy: string): Promise<void> {
    const result = await this.usersRepository.update(userId, {
      isActive: false,
      updatedAt: new Date(),
    });

    if (result.affected === 0) {
      throw new NotFoundException(`Пользователь с ID ${userId} не найден`);
    }
  }
}
