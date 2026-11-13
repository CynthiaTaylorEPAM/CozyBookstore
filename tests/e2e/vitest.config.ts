import { defineConfig } from 'vitest/config';

// Only the tidy-up's own tests run under Vitest; the browser journeys are Playwright's.
// The tidy-up tests share the test database, so run the files one at a time.
export default defineConfig({ test: { include: ['tidy/**/*.test.ts'], fileParallelism: false } });
