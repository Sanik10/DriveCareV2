// path: apps/backend/src/modules/auth/services/device.service.ts
import { Injectable } from '@nestjs/common';
import { createHash, createHmac } from 'crypto';
import { UAParser } from 'ua-parser-js';
import { DeviceInfo, DeviceIdentifier } from '../interfaces/device.interface';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class DeviceService {
  constructor(private readonly configService: ConfigService) {}

  /**
   * Стабильный deviceId для одного и того же устройства/браузера.
   * ВНИМАНИЕ: НЕ включаем IP в идентификатор, чтобы не плодить "новые устройства"
   * при смене сети/мобильного интернета. IP учитываем только в fingerprint.
   */
  generateDeviceId(identifier: DeviceIdentifier): string {
    const parser = new UAParser(identifier.userAgent);
    const device = parser.getDevice();
    const os = parser.getOS();
    const browser = parser.getBrowser();

    const deviceInfo = {
      type: device.type || '',
      model: device.model || '',
      vendor: device.vendor || '',
      os: os.name || '',
      osVersion: os.version || '',
      browser: browser.name || '',
      browserVersion: browser.version || '',
    };

    // Убираем зависимость от IP — стабильный хэш только от userId + UA-параметров
    const deviceString = `${identifier.userId}:${JSON.stringify(deviceInfo)}`;
    const secret = this.configService.get<string>('DEVICE_ID_SECRET', 'dev-device-secret');
    return createHmac('sha256', secret).update(deviceString).digest('hex');
  }

  generateDeviceName(userAgent: string): string {
    const parser = new UAParser(userAgent);
    const device = parser.getDevice();
    const os = parser.getOS();
    const browser = parser.getBrowser();

    const deviceType = device.type || (os.name ? 'Computer' : 'Unknown device');
    const deviceModel = device.model || '';
    const osName = os.name || '';

    if (deviceModel && osName) return `${deviceModel} (${osName})`;
    if (deviceModel) return deviceModel;
    if (osName) return `${deviceType} with ${osName}`;
    return `${deviceType} with ${browser.name || 'Unknown browser'}`;
  }

  parseDeviceInfo(userAgent: string): DeviceInfo {
    const parser = new UAParser(userAgent);
    const device = parser.getDevice();
    const os = parser.getOS();
    const browser = parser.getBrowser();

    return {
      type: device.type || 'unknown',
      model: device.model || 'unknown',
      os: os.name ? `${os.name} ${os.version || ''}` : 'unknown',
      browser: browser.name ? `${browser.name} ${browser.version || ''}` : 'unknown',
    };
  }

  /**
   * Отдельный fingerprint включает IP‑подсеть (для корреляций/аномалий),
   * но это не влияет на deviceId и количество "устройств".
   */
  createDeviceFingerprint(userAgent: string, ipAddress: string): string {
    const deviceInfo = this.parseDeviceInfo(userAgent);
    const fingerprintData = { ...deviceInfo, ipSubnet: this.getIpSubnet(ipAddress) };
    return createHash('sha256').update(JSON.stringify(fingerprintData)).digest('hex');
  }

  private getIpSubnet(ipAddress: string): string {
    if (!ipAddress) return 'unknown';
    if (ipAddress.includes(':')) return ipAddress.split(':').slice(0, 4).join(':');
    return ipAddress.split('.').slice(0, 3).join('.');
  }
}
