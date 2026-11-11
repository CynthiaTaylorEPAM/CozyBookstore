import { defineConfig } from 'vitest/config';

// Tests in one service share a database schema, so run the files one at a time.
export default defineConfig({ test: { fileParallelism: false } });
