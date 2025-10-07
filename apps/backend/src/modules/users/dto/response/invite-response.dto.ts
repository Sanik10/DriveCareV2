// path: apps/backend/src/modules/users/dto/response/invite-response.dto.ts
import { InviteStatus } from '../../../../database/entities/user-invite.entity';

export class InviteResponseDto {
  id: string;
  email: string;
  roleId: string;
  status: InviteStatus;
  expiresAt: string;
  createdAt: string;
  inviteUrl?: string; // возвращается только при создании
}
