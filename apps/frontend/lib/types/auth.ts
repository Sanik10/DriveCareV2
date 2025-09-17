// path: apps/frontend/lib/types/auth.ts
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;
// хотя бы 1 строчная, 1 заглавная, 1 цифра, 1 любой небуквенно-цифровой символ; разрешены любые символы, длина >= 8
export const TWO_FA_REGEX = /^\d{6}$/;

// Новый: общая проверка телефонов — допускает +, пробелы, тире, скобки; 7–20 символов суммарно
export const PHONE_REGEX = /^\+?[\d\s\-()]{7,20}$/;

// Новый: только буквы (латиница и кириллица), пробелы и дефисы
export const NAME_REGEX = /^[A-Za-zА-Яа-яЁё\s-]+$/;

export interface Role {
  id: string;
  name: string;
}

export interface UserInfo {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  specialization?: string;
  isActive: boolean;
  role: Role;
  company_id?: string;
  twoFactorEnabled?: boolean; // ДОБАВЛЕНО: статус 2FA
  createdAt: string;
  lastLoginAt?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
  twoFactorCode?: string;
}

export interface LoginResponse {
  user: UserInfo;
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
  deviceId: string;
}

// Обновлено: структура соответствует backend RegisterCompanyResponseDto + добавлен tariffId
export interface RegisterCompanyRequest {
  companyName: string;
  companyLegalName: string;
  companyAddress?: string;
  companyPhone?: string;
  companyEmail: string;

  ownerEmail: string;
  ownerPassword: string;
  ownerFirstName: string;
  ownerLastName: string;
  ownerPhone?: string;

  inviteCode?: string;
  tariffId?: string; // ДОБАВЛЕНО: ID выбранного тарифа
}

export interface RegisterCompanyResponse {
  company: {
    id: string;
    name: string;
    email: string;
  };
  owner: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  message: string;
}

// Обновлено: поддержка inviteCode (и опционально token для совместимости)
export interface RegisterInviteRequest {
  inviteCode: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  specialization?: string;
  token?: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
  expiresIn: string;
  refreshToken?: string;
  deviceId?: string;
  user?: UserInfo;
}

export interface LogoutResponse {
  success: boolean;
  message?: string;
}

export interface LogoutDeviceRequest {
  deviceId: string;
}

export interface ApiError {
  message: string;
  statusCode?: number;
}
