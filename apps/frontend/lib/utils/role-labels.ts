// path: apps/frontend/lib/utils/role-labels.ts
import type { Role } from '@/lib/types/users';

/**
 * 🎯 Человекочитаемые названия ролей
 * Используется во всех компонентах для единообразия
 */
export const ROLE_LABELS: Record<string, string> = {
  // Системные роли
  superadmin: 'Суперадминистратор',
  platform_admin: 'Администратор платформы',
  system_operator: 'Системный оператор',
  auditor: 'Аудитор',
  support_engineer: 'Инженер поддержки',
  devops: 'DevOps',

  // Компанейские административные
  company_owner: 'Владелец компании',
  company_admin: 'Администратор компании',

  // Управленческие
  manager: 'Менеджер',
  lead_mechanic: 'Старший механик',
  service_advisor: 'Сервис-адвайзер',

  // Операционные
  mechanic: 'Механик',
  diagnostic: 'Диагност',
  inventory_manager: 'Менеджер склада',
  cashier: 'Кассир',

  // Прочие
  viewer: 'Наблюдатель',
};

/**
 * 🎨 Категории ролей для группировки в UI
 */
export const ROLE_CATEGORIES = {
  system: {
    label: '🔐 Системные',
    roles: ['superadmin', 'platform_admin', 'system_operator', 'auditor', 'support_engineer', 'devops'],
  },
  admin: {
    label: '👑 Администраторы',
    roles: ['company_owner', 'company_admin'],
  },
  management: {
    label: '📊 Управление',
    roles: ['manager', 'lead_mechanic', 'service_advisor'],
  },
  operations: {
    label: '⚙️ Операционные',
    roles: ['mechanic', 'diagnostic', 'inventory_manager', 'cashier'],
  },
  other: {
    label: '👁️ Прочие',
    roles: ['viewer'],
  },
} as const;

/**
 * Получить человекочитаемое название роли
 */
export function getRoleLabel(roleNameOrSlug: string): string {
  const normalized = roleNameOrSlug.toLowerCase().trim();
  return ROLE_LABELS[normalized] || roleNameOrSlug;
}

/**
 * Получить категорию роли
 */
export function getRoleCategory(roleNameOrSlug: string): keyof typeof ROLE_CATEGORIES | null {
  const normalized = roleNameOrSlug.toLowerCase().trim();
  
  for (const [category, config] of Object.entries(ROLE_CATEGORIES)) {
    if (config.roles.includes(normalized as any)) {
      return category as keyof typeof ROLE_CATEGORIES;
    }
  }
  
  return null;
}

/**
 * Получить эмодзи для категории роли
 */
export function getRoleCategoryIcon(roleNameOrSlug: string): string {
  const category = getRoleCategory(roleNameOrSlug);
  if (!category) return '👤';
  
  const icons = {
    system: '🔐',
    admin: '👑',
    management: '📊',
    operations: '⚙️',
    other: '👁️',
  };
  
  return icons[category] || '👤';
}

/**
 * Группировка ролей по категориям для селекта
 */
export function groupRolesByCategory(roles: Role[]): Array<{
  category: string;
  label: string;
  roles: Array<{ id: string; name: string; label: string }>;
}> {
  const groups: Record<string, Array<{ id: string; name: string; label: string }>> = {};

  roles.forEach((role) => {
    const category = getRoleCategory(role.name) || 'other';
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push({
      id: role.id,
      name: role.name,
      label: getRoleLabel(role.name),
    });
  });

  return Object.entries(ROLE_CATEGORIES)
    .map(([key, config]) => ({
      category: key,
      label: config.label,
      roles: groups[key] || [],
    }))
    .filter((group) => group.roles.length > 0);
}
