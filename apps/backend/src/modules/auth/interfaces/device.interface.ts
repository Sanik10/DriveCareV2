export interface DeviceInfo {
  type: string;
  model: string;
  os: string;
  browser: string;
}

export interface DeviceIdentifier {
  userId: string;
  userAgent: string;
  ipAddress: string;
}

export interface SessionDevice {
  id: string;
  deviceId: string;
  deviceName: string;
  deviceInfo: DeviceInfo;
  ipAddress: string;
  lastActive: Date;
  createdAt: Date;
}