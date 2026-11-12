import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEV_DATABASE_URL, DEV_JWT_SECRET, loadBaseConfig, serviceUrl } from './config';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('loadBaseConfig', () => {
  it('falls back to local development settings', () => {
    vi.stubEnv('PORT', undefined);
    vi.stubEnv('DATABASE_URL', undefined);
    vi.stubEnv('JWT_SECRET', undefined);
    expect(loadBaseConfig(4001)).toEqual({ port: 4001, databaseUrl: DEV_DATABASE_URL, jwtSecret: DEV_JWT_SECRET });
  });

  it('reads the port, database and secret from the environment', () => {
    vi.stubEnv('PORT', '9000');
    vi.stubEnv('DATABASE_URL', 'postgres://elsewhere/shop');
    vi.stubEnv('JWT_SECRET', 'a-real-secret');
    expect(loadBaseConfig(4001)).toEqual({ port: 9000, databaseUrl: 'postgres://elsewhere/shop', jwtSecret: 'a-real-secret' });
  });
});

describe('serviceUrl', () => {
  it('falls back to localhost', () => {
    vi.stubEnv('CATALOG_URL', undefined);
    vi.stubEnv('CATALOG_HOSTPORT', undefined);
    expect(serviceUrl('catalog', 4001)).toBe('http://localhost:4001');
  });

  it('builds a URL from a bare host:port', () => {
    vi.stubEnv('PATRONS_URL', undefined);
    vi.stubEnv('PATRONS_HOSTPORT', 'patrons-abc:10000');
    expect(serviceUrl('patrons', 4002)).toBe('http://patrons-abc:10000');
  });

  it('prefers a full URL over a host:port', () => {
    vi.stubEnv('INCIDENTS_URL', 'https://incidents.example');
    vi.stubEnv('INCIDENTS_HOSTPORT', 'ignored:1');
    expect(serviceUrl('incidents', 4003)).toBe('https://incidents.example');
  });
});
