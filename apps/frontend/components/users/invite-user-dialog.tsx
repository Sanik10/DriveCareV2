// path: apps/frontend/components/users/invite-user-dialog.tsx
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, UserPlus, AlertCircle, Copy, Check, Shield, Users } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { usersAPI } from '@/lib/api/users';
import { groupRolesByCategory } from '@/lib/utils/role-labels';
import type { Role } from '@/lib/types/users';
import { Kbd } from '@/components/ui/kbd';

const inviteSchema = z.object({
  email: z.string().email('Некорректный email').min(1, 'Email обязателен'),
  roleId: z.string().uuid('Выберите роль'),
  expiresInDays: z.number().int().min(1).max(30).optional(),
});

type InviteForm = z.infer<typeof inviteSchema>;

interface InviteUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function InviteUserDialog({ open, onOpenChange, onSuccess }: InviteUserDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  
  const [availableRoles, setAvailableRoles] = useState<Role[]>([]);
  const [rolesLoading, setRolesLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<InviteForm>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      expiresInDays: 7,
    },
  });

  useEffect(() => {
    if (open) {
      loadAvailableRoles();
    }
  }, [open]);

  const loadAvailableRoles = async () => {
    setRolesLoading(true);
    setError(null);
    try {
      const roles = await usersAPI.listAssignableRoles();
      setAvailableRoles(roles);
    } catch (err) {
      setError('Не удалось загрузить список ролей');
      console.error('Failed to load roles:', err);
    } finally {
      setRolesLoading(false);
    }
  };

  const onSubmit = async (data: InviteForm) => {
    setIsLoading(true);
    setError(null);
    setInviteUrl(null);

    try {
      const result = await usersAPI.createInvite(data);
      setInviteUrl(result.inviteUrl || '');
      setTimeout(() => {
        reset();
        onSuccess?.();
      }, 3000);
    } catch (err: any) {
      const errorMessage = err?.message || 'Не удалось создать приглашение';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyUrl = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleClose = () => {
    reset();
    setError(null);
    setInviteUrl(null);
    setCopied(false);
    onOpenChange(false);
  };

  const groupedRoles = groupRolesByCategory(availableRoles);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent glow className="max-w-xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-primary flex items-center justify-center text-white">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle>Пригласить сотрудника</DialogTitle>
              <DialogDescription>
                Создайте приглашение для нового сотрудника. Ссылка будет действительна в течение выбранного периода.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {inviteUrl ? (
          <div className="space-y-4 mt-2">
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800">
              <Check className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
              <p className="text-sm text-green-800 dark:text-green-200 font-medium">
                ✅ Приглашение успешно создано!
              </p>
            </div>

            <div>
              <div className="text-xs text-muted-foreground mb-1">Ссылка для приглашения</div>
              <div className="flex gap-2">
                <Input value={inviteUrl} readOnly className="font-mono text-xs" />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleCopyUrl}
                  className={`rounded-xl ${copied ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' : ''}`}
                >
                  {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Отправьте эту ссылку сотруднику для регистрации в системе
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
            {error && (
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-destructive/10 border border-destructive/20">
                <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <div>
              <div className="text-xs text-muted-foreground mb-1">
                Email сотрудника <span className="text-rose-500">*</span>
              </div>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input
                  {...register('email')}
                  type="email"
                  placeholder="employee@example.com"
                  className="pl-10 h-12"
                  disabled={isLoading || rolesLoading}
                />
              </div>
              {errors.email && <p className="text-sm text-destructive mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <div className="text-xs text-muted-foreground mb-1">
                Роль <span className="text-rose-500">*</span>
              </div>
              
              {rolesLoading ? (
                <div className="flex items-center gap-2 p-3 rounded-2xl border border-border bg-muted/50">
                  <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  <span className="text-sm text-muted-foreground">Загрузка доступных ролей...</span>
                </div>
              ) : availableRoles.length === 0 ? (
                <div className="flex items-center gap-3 p-3 rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/10">
                  <Shield className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    Нет доступных ролей для назначения
                  </p>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <Users className="absolute left-3 top-3 w-4 h-4 text-muted-foreground pointer-events-none z-10" />
                    <select
                      {...register('roleId')}
                      className="w-full pl-10 pr-4 py-3 h-12 rounded-2xl border border-border/50 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all appearance-none cursor-pointer hover:border-border"
                      disabled={isLoading}
                    >
                      <option value="">Выберите роль...</option>
                      {groupedRoles.map((group) => (
                        <optgroup key={group.category} label={group.label}>
                          {group.roles.map((role) => (
                            <option key={role.id} value={role.id}>
                              {role.label}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>
                  
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1">
                    <Shield className="w-3 h-3" />
                    Отображаются только роли, которые вы можете назначать
                  </p>
                </>
              )}
              
              {errors.roleId && <p className="text-sm text-destructive mt-1">{errors.roleId.message}</p>}
            </div>

            <div>
              <div className="text-xs text-muted-foreground mb-1">Срок действия приглашения (дней)</div>
              <Input
                {...register('expiresInDays', { valueAsNumber: true })}
                type="number"
                min={1}
                max={30}
                defaultValue={7}
                disabled={isLoading || rolesLoading}
                className="h-12"
              />
              {errors.expiresInDays && (
                <p className="text-sm text-destructive mt-1">{errors.expiresInDays.message}</p>
              )}
            </div>

            <DialogFooter className="mt-4">
              <div className="hidden sm:flex items-center text-xs text-muted-foreground mr-auto">
                <span className="mr-2">Горячие клавиши:</span>
                <Kbd>Esc</Kbd>
                <span className="ml-1">— Закрыть</span>
              </div>
              <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading}>
                Отмена
              </Button>
              <Button type="submit" disabled={isLoading || rolesLoading || availableRoles.length === 0}>
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                    Создание...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Создать приглашение
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
