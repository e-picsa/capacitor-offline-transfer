export type Platform = 'android' | 'ios';
export type DeviceType = 'emulator' | 'physical';
export type DeviceStatus = 'online' | 'offline' | 'booting';

export interface DeviceInfo {
  id: string;
  name: string;
  platform: Platform;
  type: DeviceType;
  status: DeviceStatus;
  ip?: string;
  avdName?: string;
}

export interface AppInfo {
  appId: string;
  apkPath?: string;
  ipaPath?: string;
  activity?: string;
}

export interface DeployResult {
  success: boolean;
  deviceId: string;
  error?: string;
}
