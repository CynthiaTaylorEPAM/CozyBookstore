import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // `npm run test:coverage` reports how much of the code the tests run.
    coverage: { include: ['src/**'], exclude: ['src/**/*.test.ts', 'src/testing.ts', 'src/index.ts'], thresholds: { lines: 90 } },
  },
});
