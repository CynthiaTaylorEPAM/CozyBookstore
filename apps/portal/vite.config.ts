import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// In development the portal runs on :5173 and passes /api calls to the gateway on :8080.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy: { '/api': 'http://localhost:8080' } },
});
