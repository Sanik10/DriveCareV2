export const CATEGORIES_CONSTANTS = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  DEFAULT_SORT_BY: 'name',
  DEFAULT_SORT_ORDER: 'ASC' as const,
  // Глобальные категории доступны всем компаниям
  GLOBAL_CATEGORIES: [
    'Техническое обслуживание',
    'Диагностика',
    'Ремонт двигателя',
    'Ремонт трансмиссии',
    'Электрика',
    'Кузовной ремонт',
    'Шиномонтаж',
    'Мойка и детейлинг',
  ],
} as const;

export const CATEGORY_VALIDATION_MESSAGES = {
  NAME_REQUIRED: 'Название категории обязательно',
  NAME_TOO_LONG: 'Название категории не может быть длиннее 100 символов',
  DESCRIPTION_TOO_LONG: 'Описание категории не может быть длиннее 500 символов',
  NAME_EXISTS: 'Категория с таким названием уже существует',
  CATEGORY_IN_USE: 'Категория используется услугами и не может быть удалена',
  GLOBAL_CATEGORY_READONLY: 'Глобальные категории нельзя изменять',
} as const;
