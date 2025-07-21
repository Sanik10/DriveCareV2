import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { UAParser } from 'ua-parser-js';
import { DeviceInfo, DeviceIdentifier } from '../interfaces/device.interface';

@Injectable()
export class DeviceService {
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

    const deviceString = `${identifier.userId}:${JSON.stringify(deviceInfo)}:${uuidv4()}`;
    return createHash('sha256').update(deviceString).digest('hex');
  }

  generateDeviceName(userAgent: string): string {
    const parser = new UAParser(userAgent);
    const device = parser.getDevice();
    const os = parser.getOS();
    const browser = parser.getBrowser();

    const deviceType = device.type || (os.name ? 'Computer' : 'Unknown device');
    const deviceModel = device.model || '';
    const osName = os.name || '';

    if (deviceModel && osName) {
      return `${deviceModel} (${osName})`;
    } else if (deviceModel) {
      return deviceModel;
    } else if (osName) {
      return `${deviceType} with ${osName}`;
    } else {
      return `${deviceType} with ${browser.name || 'Unknown browser'}`;
    }
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
}