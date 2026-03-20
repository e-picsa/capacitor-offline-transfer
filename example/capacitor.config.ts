import { CapacitorConfig } from '@capacitor/cli';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

function loadEnv(): Record<string, string> {
  const envPath = resolve(process.cwd(), '.env');
  if (existsSync(envPath)) {
    const content = readFileSync(envPath, 'utf-8');
    const env: Record<string, string> = {};
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          env[key.trim()] = valueParts.join('=').trim();
        }
      }
    }
    return env;
  }
  return {};
}

const env = loadEnv();
const serverIp = env.CAPACITOR_SERVER_IP;
const serverPort = env.CAPACITOR_SERVER_PORT || '5173';

const config: CapacitorConfig = {
  appId: 'com.example.plugin',
  appName: 'example',
  webDir: 'dist',
  plugins: {
    SplashScreen: {
      launchAutoHide: false,
    },
  },
  server: {
    cleartext: true,
    ...(serverIp ? { url: `http://${serverIp}:${serverPort}` } : {}),
  },
};

export default config;
