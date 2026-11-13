import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const previewMode = process.env.BASE44_PREVIEW_MODE === '1';
const allowedHosts = [];
if (previewMode && process.env.__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS) {
  allowedHosts.push(process.env.__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS);
}

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: true,
    allowedHosts,
    watch: { usePolling: true, interval: 400 },
    proxy: {
      '/api': {
        target: process.env.API_PROXY_TARGET || 'http://api:8000',
        changeOrigin: true,
      },
    },
  },
});
