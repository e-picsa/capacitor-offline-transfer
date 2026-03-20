import preact from '@preact/preset-vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

const serverPort = parseInt(process.env.CAPACITOR_SERVER_PORT || '5173', 10);

export default defineConfig({
  root: './src',
  plugins: [preact(), tailwindcss()],
  server: {
    host: '0.0.0.0',
    port: serverPort,
  },
  build: {
    outDir: '../dist',
    minify: false,
    emptyOutDir: true,
  },
});
