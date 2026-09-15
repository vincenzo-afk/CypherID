import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: env.VITE_API_URL || 'http://localhost:8080',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist',
    // Default 'assets' collides with the /assets React route: nginx sees the
    // dist/assets directory and 301-redirects /assets -> /assets/ (wrong port
    // behind the :3000 mapping) instead of serving the SPA. 'static' avoids
    // every app route.
    assetsDir: 'static'
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
    include: ['src/**/*.{test,spec}.{js,jsx}']
  }
  };
});
