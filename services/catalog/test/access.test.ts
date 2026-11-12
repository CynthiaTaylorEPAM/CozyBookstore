import { join } from 'node:path';
import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createPool, listRoutes, migrate, staffHeaders, TEST_DATABASE_URL, TEST_JWT_SECRET } from '@griffin/shared';
import { buildApp } from '../src/app';

let db: Pool;
let app: FastifyInstance;

beforeAll(async () => {
  db = createPool(TEST_DATABASE_URL, 'catalog');
  await migrate(db, 'catalog', join(__dirname, '..', 'migrations'));
  app = buildApp({ db, jwtSecret: TEST_JWT_SECRET });
  await app.ready();
});

beforeEach(async () => {
  await db.query('TRUNCATE tomes, stock_adjustments RESTART IDENTITY CASCADE');
  await db.query(`INSERT INTO tomes (title, author, genre, price_cp, stock) VALUES ('Dragons at Tea', 'Orsolya', 'bestiary', 1000, 3)`);
});

afterAll(async () => {
  await app.close();
  await db.end();
});

const tome = { title: 'Stonesong', author: 'Thrain', genre: 'poetry', priceCp: 800 };

/**
 * Who may use each route. `anyone` needs no sign-in, `staff` is the clerk or
 * the owner, `owner` is the owner alone. Every route must be listed here.
 */
const rules: { route: string; url: string; payload?: object; allowed: 'anyone' | 'staff' | 'owner' }[] = [
  { route: 'GET /health', url: '/health', allowed: 'anyone' },
  { route: 'GET /public/tomes', url: '/public/tomes', allowed: 'anyone' },
  { route: 'GET /tomes', url: '/tomes', allowed: 'staff' },
  { route: 'GET /tomes/:id', url: '/tomes/1', allowed: 'staff' },
  { route: 'POST /tomes', url: '/tomes', payload: tome, allowed: 'owner' },
  { route: 'PATCH /tomes/:id', url: '/tomes/1', payload: { priceCp: 900 }, allowed: 'owner' },
  { route: 'POST /tomes/:id/stock-adjustments', url: '/tomes/1/stock-adjustments', payload: { delta: 1, reason: 'Delivery' }, allowed: 'staff' },
  { route: 'GET /tomes/:id/stock-adjustments', url: '/tomes/1/stock-adjustments', allowed: 'staff' },
];

describe('who may use the catalog', () => {
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

  it('refuses a token signed with a different secret', async () => {
    const response = await app.inject({ method: 'GET', url: '/tomes', headers: staffHeaders('owner', 'not-our-secret') });
    expect(response.statusCode).toBe(401);
  });
});

describe('what the catalog refuses as invalid', () => {
  const owner = staffHeaders('owner');

  it.each([
    ['an empty title', { ...tome, title: '   ' }],
    ['a title that is far too long', { ...tome, title: 'x'.repeat(201) }],
    ['no author', { title: 'Stonesong', genre: 'poetry', priceCp: 800 }],
    ['a negative price', { ...tome, priceCp: -1 }],
    ['a price with a fraction of a copper', { ...tome, priceCp: 1.5 }],
    ['a price sent as text', { ...tome, priceCp: '800' }],
    ['negative stock', { ...tome, stock: -1 }],
    ['an unknown condition', { ...tome, condition: 'soggy' }],
    ['a flag that is not yes or no', { ...tome, featured: 'yes' }],
  ])('a new tome with %s', async (_label, payload) => {
    const response = await app.inject({ method: 'POST', url: '/tomes', headers: owner, payload });
    expect(response.statusCode).toBe(400);
    expect(response.json().error).toBe('Invalid request');
    const tomes = await app.inject({ method: 'GET', url: '/tomes', headers: owner });
    expect(tomes.json()).toHaveLength(1);
  });

  it.each([
    ['a negative price', { priceCp: -1 }],
    ['an unknown genre', { genre: 'tax law' }],
    ['an empty title', { title: '' }],
  ])('a change with %s', async (_label, payload) => {
    const response = await app.inject({ method: 'PATCH', url: '/tomes/1', headers: owner, payload });
    expect(response.statusCode).toBe(400);
  });

  it.each([
    ['a change of nothing', { delta: 0, reason: 'Recount' }],
    ['half a copy', { delta: 0.5, reason: 'Torn in two' }],
    ['no reason', { delta: 1 }],
    ['a blank reason', { delta: 1, reason: '  ' }],
  ])('a stock adjustment with %s', async (_label, payload) => {
    const response = await app.inject({ method: 'POST', url: '/tomes/1/stock-adjustments', headers: owner, payload });
    expect(response.statusCode).toBe(400);
  });

  it.each(['abc', '0', '-1', '1.5'])('a tome number of "%s"', async (id) => {
    const response = await app.inject({ method: 'GET', url: `/tomes/${id}`, headers: owner });
    expect(response.statusCode).toBe(400);
  });

  it('a genre filter the shop does not stock', async () => {
    const response = await app.inject({ method: 'GET', url: '/tomes?genre=tax%20law', headers: owner });
    expect(response.statusCode).toBe(400);
  });
});
