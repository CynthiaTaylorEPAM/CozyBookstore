import { join } from 'node:path';
import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createPool, fakeCatalog, listRoutes, migrate, staffHeaders, TEST_DATABASE_URL, TEST_JWT_SECRET } from '@griffin/shared';
import { buildApp } from '../src/app';

let db: Pool;
let app: FastifyInstance;

beforeAll(async () => {
  db = createPool(TEST_DATABASE_URL, 'patrons');
  await migrate(db, 'patrons', join(__dirname, '..', 'migrations'));
});

beforeEach(async () => {
  await db.query('TRUNCATE patrons, sales RESTART IDENTITY CASCADE');
  await db.query(`INSERT INTO patrons (name, race, home, notes) VALUES ('Thrain Emberforge', 'dwarf', 'Deep Halls', 'Owes us a ballad.')`);
  app = buildApp({ db, jwtSecret: TEST_JWT_SECRET, catalog: fakeCatalog().client });
  await app.ready();
});

afterAll(async () => {
  await db.end();
});

const sale = { patronId: 1, tomeId: 7, quantity: 1 };

/**
 * Who may use each route. `anyone` needs no sign-in, `staff` is the clerk or
 * the owner, `owner` is the owner alone. Every route must be listed here.
 */
const rules: { route: string; url: string; payload?: object; allowed: 'anyone' | 'staff' | 'owner' }[] = [
  { route: 'GET /health', url: '/health', allowed: 'anyone' },
  { route: 'GET /public/patron-stats', url: '/public/patron-stats', allowed: 'anyone' },
  { route: 'GET /patrons', url: '/patrons', allowed: 'staff' },
  { route: 'GET /patrons/:id', url: '/patrons/1', allowed: 'staff' },
  { route: 'POST /patrons', url: '/patrons', payload: { name: 'Pim', race: 'halfling' }, allowed: 'staff' },
  { route: 'PATCH /patrons/:id', url: '/patrons/1', payload: { tier: 'regular' }, allowed: 'owner' },
  { route: 'GET /sales', url: '/sales', allowed: 'staff' },
  { route: 'POST /sales', url: '/sales', payload: sale, allowed: 'staff' },
  { route: 'GET /sales/summary', url: '/sales/summary', allowed: 'owner' },
];

describe('who may use the guest book and the till', () => {
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

  it('gives away nothing personal on the public page', async () => {
    const response = await app.inject({ method: 'GET', url: '/public/patron-stats' });
    expect(response.json()).toEqual({ totalPatrons: 1, byRace: [{ race: 'dwarf', count: 1 }] });
    for (const secret of ['Thrain', 'Deep Halls', 'ballad']) expect(response.body).not.toContain(secret);
  });
});

describe('what the guest book and the till refuse as invalid', () => {
  const owner = staffHeaders('owner');

  it.each([
    ['no name', { race: 'elf' }],
    ['a blank name', { name: '  ', race: 'elf' }],
    ['a name that is far too long', { name: 'x'.repeat(121), race: 'elf' }],
    ['no race', { name: 'Zorp' }],
    ['notes that run on too long', { name: 'Zorp', race: 'elf', notes: 'x'.repeat(1001) }],
  ])('a new patron with %s', async (_label, payload) => {
    const response = await app.inject({ method: 'POST', url: '/patrons', headers: owner, payload });
    expect(response.statusCode).toBe(400);
    expect(response.json().error).toBe('Invalid request');
  });

  it('a membership tier that does not exist', async () => {
    const response = await app.inject({ method: 'PATCH', url: '/patrons/1', headers: owner, payload: { tier: 'archmage' } });
    expect(response.statusCode).toBe(400);
  });

  it.each([
    ['no copies', { ...sale, quantity: 0 }],
    ['a negative number of copies', { ...sale, quantity: -1 }],
    ['a hundred copies at once', { ...sale, quantity: 100 }],
    ['half a copy', { ...sale, quantity: 0.5 }],
    ['no patron', { tomeId: 7, quantity: 1 }],
    ['no tome', { patronId: 1, quantity: 1 }],
    ['a patron number sent as text', { ...sale, patronId: '1' }],
  ])('a sale with %s', async (_label, payload) => {
    const response = await app.inject({ method: 'POST', url: '/sales', headers: owner, payload });
    expect(response.statusCode).toBe(400);
    expect((await db.query('SELECT 1 FROM sales')).rowCount).toBe(0);
  });

  it('accepts the largest sale allowed, when the shelf can cover it', async () => {
    const catalog = fakeCatalog();
    catalog.tome.stock = 99;
    const till = buildApp({ db, jwtSecret: TEST_JWT_SECRET, catalog: catalog.client });
    const response = await till.inject({ method: 'POST', url: '/sales', headers: owner, payload: { ...sale, quantity: 99 } });
    expect(response.statusCode).toBe(201);
    expect(response.json().totalCp).toBe(99_000);
  });

  it.each(['abc', '0', '-1'])('a patron number of "%s"', async (id) => {
    const response = await app.inject({ method: 'GET', url: `/patrons/${id}`, headers: owner });
    expect(response.statusCode).toBe(400);
  });
});
