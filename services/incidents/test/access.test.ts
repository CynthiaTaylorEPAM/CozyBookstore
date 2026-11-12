import { join } from 'node:path';
import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createPool, fakeCatalog, listRoutes, migrate, staffHeaders, TEST_DATABASE_URL, TEST_JWT_SECRET } from '@griffin/shared';
import { buildApp } from '../src/app';

let db: Pool;
let app: FastifyInstance;

beforeAll(async () => {
  db = createPool(TEST_DATABASE_URL, 'incidents');
  await migrate(db, 'incidents', join(__dirname, '..', 'migrations'));
});

beforeEach(async () => {
  await db.query('TRUNCATE incidents, wards RESTART IDENTITY CASCADE');
  await db.query(`INSERT INTO incidents (monster, severity, description, reported_by) VALUES ('mimic', 'minor', 'Pretending to be a footstool.', 'pip')`);
  app = buildApp({ db, jwtSecret: TEST_JWT_SECRET, catalog: fakeCatalog().client });
  await app.ready();
});

afterAll(async () => {
  await db.end();
});

const sighting = { monster: 'dust wraith', severity: 'minor', description: 'Sneezing on the top shelf.' };

/**
 * Who may use each route. `anyone` needs no sign-in, `staff` is the clerk or
 * the owner, `owner` is the owner alone. Every route must be listed here.
 */
const rules: { route: string; url: string; payload?: object; allowed: 'anyone' | 'staff' | 'owner' }[] = [
  { route: 'GET /health', url: '/health', allowed: 'anyone' },
  { route: 'GET /public/shop-status', url: '/public/shop-status', allowed: 'anyone' },
  { route: 'GET /wards', url: '/wards', allowed: 'staff' },
  { route: 'GET /incidents', url: '/incidents', allowed: 'staff' },
  { route: 'POST /incidents', url: '/incidents', payload: sighting, allowed: 'staff' },
  { route: 'POST /incidents/:id/resolve', url: '/incidents/1/resolve', payload: { resolution: 'Sat on it.' }, allowed: 'owner' },
];

describe('who may use the incident log', () => {
  it('has a rule for every route', () => {
    expect(listRoutes(app)).toEqual(rules.map((rule) => rule.route).sort());
  });

  describe.each(rules)('$route', ({ route, url, payload, allowed }) => {
    const call = (headers?: { authorization: string }) =>
      app.inject({ method: route.split(' ')[0] as 'GET', url, payload, headers });

    it(allowed === 'anyone' ? 'needs no sign-in' : 'turns away anyone who is not signed in', async () => {
      const status = (await call()).statusCode;
      if (allowed === 'anyone') expect(status).toBeLessThan(300);
      else expect(status).toBe(401);
    });

    it(allowed === 'owner' ? 'is closed to the clerk' : 'is open to the clerk', async () => {
      const status = (await call(staffHeaders('clerk'))).statusCode;
      if (allowed === 'owner') expect(status).toBe(403);
      else expect(status).toBeLessThan(300);
    });

    it('is open to the owner', async () => {
      expect((await call(staffHeaders('owner'))).statusCode).toBeLessThan(300);
    });
  });
});

describe('what the incident log refuses as invalid', () => {
  const owner = staffHeaders('owner');

  it.each([
    ['an unknown severity', { ...sighting, severity: 'apocalyptic' }],
    ['no description', { monster: 'mimic', severity: 'minor' }],
    ['a blank description', { ...sighting, description: '   ' }],
    ['a description that runs on too long', { ...sighting, description: 'x'.repeat(1001) }],
    ['a negative number of damaged copies', { ...sighting, tomeId: 7, copiesDamaged: -1 }],
    ['a thousand damaged copies', { ...sighting, tomeId: 7, copiesDamaged: 1000 }],
    ['half a damaged copy', { ...sighting, tomeId: 7, copiesDamaged: 0.5 }],
    ['a tome number of zero', { ...sighting, tomeId: 0 }],
  ])('a report with %s', async (_label, payload) => {
    const response = await app.inject({ method: 'POST', url: '/incidents', headers: owner, payload });
    expect(response.statusCode).toBe(400);
    expect(response.json().error).toBe('Invalid request');
    expect((await db.query('SELECT 1 FROM incidents')).rowCount).toBe(1);
  });

  it.each([
    ['no resolution', {}],
    ['a blank resolution', { resolution: '  ' }],
  ])('resolving with %s', async (_label, payload) => {
    const response = await app.inject({ method: 'POST', url: '/incidents/1/resolve', headers: owner, payload });
    expect(response.statusCode).toBe(400);
  });

  it('an incident number that is not a number', async () => {
    const response = await app.inject({ method: 'POST', url: '/incidents/abc/resolve', headers: owner, payload: { resolution: 'x' } });
    expect(response.statusCode).toBe(400);
  });

  it('a status filter other than open or resolved', async () => {
    const response = await app.inject({ method: 'GET', url: '/incidents?status=ignored', headers: owner });
    expect(response.statusCode).toBe(400);
  });
});
