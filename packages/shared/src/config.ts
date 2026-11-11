/** Settings every service reads from the environment, with local-dev defaults. */
export interface BaseConfig {
  port: number;
  databaseUrl: string;
  jwtSecret: string;
}

export const DEV_DATABASE_URL = 'postgres://griffin:griffin@localhost:5432/griffin';
export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgres://griffin:griffin@localhost:5432/griffin_test';
export const DEV_JWT_SECRET = 'dev-only-secret-do-not-use-in-production';

export function loadBaseConfig(defaultPort: number): BaseConfig {
  return {
    port: Number(process.env.PORT ?? defaultPort),
    databaseUrl: process.env.DATABASE_URL ?? DEV_DATABASE_URL,
    jwtSecret: process.env.JWT_SECRET ?? DEV_JWT_SECRET,
  };
}

/**
 * Where another service lives. Reads CATALOG_URL (a full URL) or, on hosts
 * that only hand out "host:port", CATALOG_HOSTPORT. Falls back to localhost.
 */
export function serviceUrl(name: 'catalog' | 'patrons' | 'incidents', localPort: number): string {
  const key = name.toUpperCase();
  if (process.env[`${key}_URL`]) return process.env[`${key}_URL`]!;
  if (process.env[`${key}_HOSTPORT`]) return `http://${process.env[`${key}_HOSTPORT`]}`;
  return `http://localhost:${localPort}`;
}
