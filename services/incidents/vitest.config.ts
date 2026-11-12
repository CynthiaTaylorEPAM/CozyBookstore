import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Tests in one service share a database schema, so run the files one at a time.
    fileParallelism: false,
    // `npm run test:coverage` reports how much of the code the tests run.
    // index.ts only starts the service; the browser tests cover it.
    coverage: { include: ['src/**'], exclude: ['src/index.ts'], thresholds: { lines: 85 } },
  },
});
