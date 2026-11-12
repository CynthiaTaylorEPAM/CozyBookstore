import { defineConfig } from 'vitest/config';

// These tests share one database with each other, so run the files one at a time.
export default defineConfig({ test: { fileParallelism: false } });
