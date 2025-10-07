// path: apps/backend/src/modules/users/dto/request/create-invite.dto.ts
import { IsEmail, IsUUID, IsInt, Min, Max, IsOptional } from 'class-validator';

export class CreateInviteDto {
  @IsEmail()
  email: string;

  @IsUUID()
  roleId: string;

  /**
   * 🔐 SECURITY: companyId обязателен для компанийных ролей, null — для системных.
   * Валидация происходит в UsersInvitationsService.createInvite() через RoleHierarchyService.
   */
  @IsOptional()
  @IsUUID()
  companyId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(30)
  expiresInDays?: number; // default 7
}
