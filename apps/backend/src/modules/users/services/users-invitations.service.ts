// path: apps/backend/src/modules/users/services/users-invitations.service.ts
import { Injectable, ForbiddenException, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { UserInvite, InviteStatus } from '../../../database/entities/user-invite.entity';
import { Role } from '../../../database/entities/role.entity';
import { User } from '../../../database/entities/user.entity';
import { InvalidTokenException } from '../../../common/exceptions/custom-exceptions';
import { RoleHierarchyService } from './role-hierarchy.service';

type CreateInviteParams = {
  companyId: string | null; // <-- теперь может быть null
  invitedByUserId: string;
  email: string;
  roleId: string;
  expiresInDays?: number;
};

type ResendInviteResult = {
  inviteUrl: string;
};

@Injectable()
export class UsersInvitationsService {
  private readonly logger = new Logger(UsersInvitationsService.name);

  constructor(
    @InjectRepository(UserInvite)
    private readonly invitesRepo: Repository<UserInvite>,
    @InjectRepository(Role)
    private readonly rolesRepo: Repository<Role>,
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    private readonly roleHierarchy: RoleHierarchyService,
  ) {}

  private normalizeEmail(email: string): string {
    return (email || '').trim().toLowerCase();
  }

  private now(): Date {
    return new Date();
  }

  private addDays(base: Date, days: number): Date {
    const d = new Date(base);
    d.setUTCDate(d.getUTCDate() + days);
    return d;
  }

  /**
   * 🔧 ИСПРАВЛЕНО: Генерация токена 64 hex символа (32 байта)
   */
  private generateToken(): string {
    const token = randomBytes(32).toString('hex');
    this.logger.debug(`Generated invite token: length=${token.length}, sample=${token.substring(0, 16)}...`);
    return token;
  }

  private getFrontendBaseUrl(): string {
    const env = (process.env.FRONTEND_URL || '').trim();
    const url = env.length > 0 ? env.replace(/\/+$/, '') : 'http://localhost:3000';
    this.logger.debug(`Frontend URL: ${url}`);
    return url;
  }

  private buildInviteUrl(token: string): string {
    const baseUrl = this.getFrontendBaseUrl();
    const inviteUrl = `${baseUrl}/register/invite?token=${encodeURIComponent(token)}`;
    this.logger.debug(`Built invite URL: ${inviteUrl.substring(0, 60)}...`);
    return inviteUrl;
  }

  private async ensureUniqueToken(): Promise<string> {
    for (let i = 0; i < 5; i++) {
      const token = this.generateToken();
      const exists = await this.invitesRepo.exist({ where: { token } });
      if (!exists) {
        this.logger.debug(`Unique token generated on attempt ${i + 1}`);
        return token;
      }
      this.logger.warn(`Token collision detected on attempt ${i + 1}, regenerating...`);
    }
    const finalToken = this.generateToken();
    this.logger.warn('Max token generation attempts reached, using final token');
    return finalToken;
  }

  /**
   * 🔐 КРИТИЧЕСКОЕ ОБНОВЛЕНИЕ: Создание приглашения с проверкой иерархии + валидацией соответствия типа роли и companyId
   */
  async createInvite(params: CreateInviteParams): Promise<{ saved: UserInvite; inviteUrl: string }> {
    this.logger.log(`Creating invite: email=${params.email}, roleId=${params.roleId}, companyId=${params.companyId}`);

    const email = this.normalizeEmail(params.email);

    // 🔐 1. ПОЛНАЯ ВАЛИДАЦИЯ НАЗНАЧЕНИЯ РОЛИ (через RoleHierarchyService)
    const validation = await this.roleHierarchy.validateRoleAssignment({
      assignerId: params.invitedByUserId,
      targetRoleId: params.roleId,
      companyId: params.companyId,
    });

    if (!validation.canAssign) {
      this.logger.error(
        `SECURITY: Role assignment validation failed: ${validation.reason}, ` +
        `inviter=${params.invitedByUserId}, roleId=${params.roleId}`
      );

      throw new ForbiddenException(
        validation.reason || 'Вы не можете пригласить пользователя с этой ролью'
      );
    }

    const { assigner, targetRole } = validation;

    // 🔐 2. ДОПОЛНИТЕЛЬНАЯ ВАЛИДАЦИЯ: companyId должен соответствовать типу роли
    const isSystemRole = !targetRole.companyId; // если у роли нет companyId — она системная
    if (isSystemRole && params.companyId !== null) {
      this.logger.error(`SECURITY VIOLATION: System role assigned with companyId: roleId=${targetRole.id}, providedCompanyId=${params.companyId}`);
      throw new ForbiddenException('Системные роли не могут быть привязаны к компании');
    }
    if (!isSystemRole && !params.companyId) {
      this.logger.error(`SECURITY VIOLATION: Company role assigned without companyId: roleId=${targetRole.id}`);
      throw new ForbiddenException('Для компанийных ролей companyId обязателен');
    }

    this.logger.log(
      `✅ Role assignment validated: ${assigner.role.name} → ${targetRole.name} (system=${isSystemRole})`
    );

    // 3. Проверка, что email ещё не зарегистрирован
    const existingUser = await this.usersRepo.findOne({ where: { email } });
    if (existingUser) {
      this.logger.warn(`User already exists: email=${email}`);
      throw new ConflictException('Пользователь с таким email уже существует');
    }

    // 4. Отзываем старые активные инвайты для того же email в компании (если компания указана)
    let revokedCount = 0;
    if (params.companyId) {
      const result = await this.invitesRepo
        .createQueryBuilder()
        .update(UserInvite)
        .set({ status: 'revoked' as InviteStatus })
        .where('companyId = :companyId AND LOWER(email) = :email AND status = :status', {
          companyId: params.companyId,
          email,
          status: 'pending',
        })
        .execute();

      revokedCount = result.affected || 0;
    } else {
      // Для системных ролей — отзыв по email без привязки к компании
      const result = await this.invitesRepo
        .createQueryBuilder()
        .update(UserInvite)
        .set({ status: 'revoked' as InviteStatus })
        .where('companyId IS NULL AND LOWER(email) = :email AND status = :status', {
          email,
          status: 'pending',
        })
        .execute();

      revokedCount = result.affected || 0;
    }

    if (revokedCount > 0) {
      this.logger.log(`Revoked ${revokedCount} old pending invite(s) for email=${email}`);
    }

    // 5. Создание нового инвайта
    const token = await this.ensureUniqueToken();
    const expiresInDays = params.expiresInDays ?? 7;
    const expiresAt = this.addDays(this.now(), expiresInDays);

    this.logger.debug(`Creating invite entity: token=${token.substring(0, 16)}..., expiresIn=${expiresInDays} days`);

    const entity = this.invitesRepo.create({
      companyId: params.companyId, // может быть null
      invitedByUserId: params.invitedByUserId,
      email,
      roleId: params.roleId,
      token,
      expiresAt,
      status: 'pending',
    });

    const saved = await this.invitesRepo.save(entity);
    const inviteUrl = this.buildInviteUrl(token);

    this.logger.log(
      `✅ Invite created successfully: id=${saved.id}, email=${email}, role=${targetRole.name}, ` +
      `invitedBy=${assigner.role.name}, token=${token.substring(0, 16)}...`
    );

    return { saved, inviteUrl };
  }

  async listInvites(companyId: string | null, status?: InviteStatus): Promise<UserInvite[]> {
    const where: any = companyId !== null ? { companyId } : { companyId: null };
    if (status) where.status = status;
    const list = await this.invitesRepo.find({ where, order: { createdAt: 'DESC' } });

    // помечаем просроченные как expired (лениво)
    const now = this.now();
    const toExpire = list.filter((i) => i.status === 'pending' && i.expiresAt < now);
    if (toExpire.length > 0) {
      await this.invitesRepo
        .createQueryBuilder()
        .update(UserInvite)
        .set({ status: 'expired' as InviteStatus })
        .whereInIds(toExpire.map((x) => x.id))
        .execute();
      toExpire.forEach((x) => (x.status = 'expired'));
      this.logger.debug(`Marked ${toExpire.length} invite(s) as expired`);
    }

    return list;
  }

  async resendInvite(companyId: string | null, id: string): Promise<ResendInviteResult> {
    const invite = await this.invitesRepo.findOne({ where: { id } });
    if (!invite) {
      this.logger.error(`Invite not found: id=${id}`);
      throw new NotFoundException('Инвайт не найден');
    }

    // 🔐 Проверка соответствия типа приглашения
    if (companyId !== null) {
      if (invite.companyId !== companyId) {
        this.logger.warn(`Company mismatch on resend: invite.companyId=${invite.companyId}, expected=${companyId}`);
        throw new ForbiddenException('Инвайт принадлежит другой компании');
      }
    } else {
      if (invite.companyId !== null) {
        this.logger.warn(`Cannot resend company invite as system: invite.companyId=${invite.companyId}`);
        throw new ForbiddenException('Это приглашение компании, не системное');
      }
    }

    if (invite.status === 'accepted' || invite.status === 'revoked') {
      this.logger.warn(`Cannot resend invite with status: ${invite.status}, id=${id}`);
      throw new ForbiddenException('Нельзя отправить повторно использованный/отозванный инвайт');
    }

    const now = this.now();
    const token = await this.ensureUniqueToken();

    invite.token = token;
    invite.expiresAt = this.addDays(now, 7);
    invite.status = 'pending';

    await this.invitesRepo.save(invite);
    this.logger.log(`✅ Invite resent: id=${id}, newToken=${token.substring(0, 16)}...`);

    return { inviteUrl: this.buildInviteUrl(token) };
  }

  async revokeInvite(companyId: string | null, id: string): Promise<void> {
    const invite = await this.invitesRepo.findOne({ where: { id } });
    if (!invite) {
      this.logger.error(`Invite not found: id=${id}`);
      throw new NotFoundException('Инвайт не найден');
    }

    // 🔐 Проверка соответствия типа приглашения
    if (companyId !== null) {
      if (invite.companyId !== companyId) {
        this.logger.warn(`Company mismatch on revoke: invite.companyId=${invite.companyId}, expected=${companyId}`);
        throw new ForbiddenException('Инвайт принадлежит другой компании');
      }
    } else {
      if (invite.companyId !== null) {
        this.logger.warn(`Cannot revoke company invite as system: invite.companyId=${invite.companyId}`);
        throw new ForbiddenException('Это приглашение компании, не системное');
      }
    }

    if (invite.status === 'accepted') {
      this.logger.warn(`Cannot revoke accepted invite: id=${id}`);
      throw new ForbiddenException('Инвайт уже был принят');
    }
    if (invite.status !== 'revoked') {
      invite.status = 'revoked';
      await this.invitesRepo.save(invite);
      this.logger.log(`✅ Invite revoked: id=${id}`);
    }
  }

  async getPendingInviteOrThrow(token: string): Promise<UserInvite> {
    this.logger.debug(`Looking up invite by token: ${token.substring(0, 16)}...`);

    /**
     * 🔧 ИСПРАВЛЕНО: Добавлена проверка длины токена
     */
    if (!token || token.length !== 64) {
      this.logger.error(`Invalid token format: length=${token?.length || 0}, expected=64`);
      throw new InvalidTokenException();
    }

    const invite = await this.invitesRepo.findOne({ where: { token } });
    if (!invite) {
      this.logger.error(`Invite not found by token: ${token.substring(0, 16)}...`);
      throw new InvalidTokenException();
    }

    this.logger.debug(`Found invite: id=${invite.id}, status=${invite.status}, email=${invite.email}`);

    const now = this.now();
    if (invite.status !== 'pending') {
      this.logger.warn(`Invite status is not pending: status=${invite.status}, id=${invite.id}`);
      throw new InvalidTokenException();
    }
    if (invite.expiresAt < now) {
      // лениво помечаем как expired
      invite.status = 'expired';
      await this.invitesRepo.save(invite);
      this.logger.warn(`Invite expired: id=${invite.id}, expiresAt=${invite.expiresAt}`);
      throw new InvalidTokenException();
    }

    this.logger.log(`✅ Valid pending invite found: id=${invite.id}, email=${invite.email}`);
    return invite;
  }

  async consumeInvite(token: string, acceptedByUserId: string): Promise<void> {
    this.logger.debug(`Consuming invite: token=${token.substring(0, 16)}..., acceptedBy=${acceptedByUserId}`);

    const invite = await this.invitesRepo.findOne({ where: { token } });
    if (!invite) {
      this.logger.error(`Invite not found during consume: token=${token.substring(0, 16)}...`);
      throw new InvalidTokenException();
    }

    const now = this.now();
    if (invite.status !== 'pending' || invite.expiresAt < now) {
      if (invite.status === 'pending' && invite.expiresAt < now) {
        invite.status = 'expired';
        await this.invitesRepo.save(invite);
        this.logger.warn(`Invite expired during consume: id=${invite.id}`);
      }
      throw new InvalidTokenException();
    }

    invite.status = 'accepted';
    invite.acceptedByUserId = acceptedByUserId;
    invite.acceptedAt = now;
    await this.invitesRepo.save(invite);

    this.logger.log(`✅ Invite consumed: id=${invite.id}, acceptedBy=${acceptedByUserId}`);
  }
}
