import preact from '@preact/preset-vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  root: './src',
  plugins: [preact(), tailwindcss()],
  build: {
    outDir: '../dist',
    minify: false,
    emptyOutDir: true,
  },
});
