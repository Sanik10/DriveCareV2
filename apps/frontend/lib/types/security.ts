// path: apps/frontend/lib/types/security.ts

export interface SessionDevice {
  id: string
  deviceId: string
  deviceName: string
  deviceInfo: DeviceInfo
  ipAddress: string
  lastActive: Date
  createdAt: Date
  isCurrentDevice?: boolean
}

export interface DeviceInfo {
  type: string
  model: string
  os: string
  browser: string
}

export interface SessionInfo {
  id: string
  userId: string
  deviceId: string
  status: 'active' | 'expired' | 'revoked'
  createdAt: Date
  updatedAt: Date
}

// 2FA Types
export interface TwoFASetupResponse {
  secret: string
  otpauthUrl: string
  qrCodeUrl?: string
}

export interface TwoFAStatusResponse {
  enabled: boolean
  secret?: string
}

export interface TwoFAEnableRequest {
  code: string
  secret: string
}

export interface TwoFADisableRequest {
  code: string
}

export interface LogoutDeviceRequest {
  deviceId: string
}

export interface SecurityResponse {
  success: boolean
  message?: string
}
