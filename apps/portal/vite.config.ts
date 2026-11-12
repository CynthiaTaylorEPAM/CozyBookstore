import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// In development the portal runs on :5173 and passes /api calls to the gateway on :8080.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy: { '/api': 'http://localhost:8080' } },
  // Tests run in jsdom, a pretend browser, so screens can be rendered and clicked.
  test: {
    environment: 'jsdom',
    setupFiles: ['src/test/setup.ts'],
    // `npm run test:coverage` reports how much of the code the tests run.
    coverage: { include: ['src/**'], exclude: ['src/**/*.test.{ts,tsx}', 'src/test/**', 'src/main.tsx', 'src/types.ts'], thresholds: { lines: 70 } },
  },
});
