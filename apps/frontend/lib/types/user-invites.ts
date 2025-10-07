// path: apps/frontend/lib/types/user-invites.ts
export type InviteStatus = 'pending' | 'accepted' | 'revoked' | 'expired';

export interface UserInvite {
  id: string;
  email: string;
  roleId: string;
  status: InviteStatus;
  expiresAt: string;
  createdAt: string;
  inviteUrl?: string; // приходит при создании
}
