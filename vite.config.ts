import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/Ryu-Workout/',
  plugins: [react()],
  server: { host: '0.0.0.0' },
  build: { sourcemap: true },
});