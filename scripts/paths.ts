import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const EXAMPLE_APP = resolve(ROOT, 'example');
const SCRIPTS = __dirname;

export const PATHS = {
  ROOT,
  EXAMPLE_APP,
  SCRIPTS,
};
