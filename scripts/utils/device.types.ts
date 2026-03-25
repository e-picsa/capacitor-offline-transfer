export type DeviceKind = 'emulator' | 'physical' | 'ios-simulator';

export interface DeviceTarget {
  kind: DeviceKind;
  id: string;
  name?: string;
  ip?: string;
}

export function getDeviceDisplayName(device: DeviceTarget): string {
  return device.name || device.id;
}

export function isWirelessDevice(device: DeviceTarget): boolean {
  return device.kind === 'physical' && !!device.ip;
}

export function getTargetId(device: DeviceTarget): string {
  return device.id;
}
