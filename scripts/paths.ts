import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const EXAMPLE_APP = resolve(ROOT, 'example');
const EXAMPLE_APP_APK = resolve(EXAMPLE_APP, 'android/app/build/outputs/apk/debug/app-debug.apk');
const EXAMPLE_APP_IPA = resolve(EXAMPLE_APP, 'ios/App/build/Debug-iphonesimulator/App.ipa');
const SCRIPTS = __dirname;

export const PATHS = {
  ROOT,
  EXAMPLE_APP,
  EXAMPLE_APP_APK,
  EXAMPLE_APP_IPA,
  SCRIPTS,
};
