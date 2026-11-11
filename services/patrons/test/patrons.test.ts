import { join } from 'node:path';
import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { type CatalogClient, createPool, HttpError, migrate, signToken, TEST_DATABASE_URL } from '@griffin/shared';
import { buildApp } from '../src/app';

const SECRET = 'test-secret';
const owner = { authorization: `Bearer ${signToken({ id: 1, username: 'mirabel', displayName: 'Mirabel', role: 'owner' }, SECRET)}` };
const clerk = { authorization: `Bearer ${signToken({ id: 2, username: 'pip', displayName: 'Pip', role: 'clerk' }, SECRET)}` };

/** Stands in for the catalog service: one tome, three copies on the shelf. */
function fakeCatalog() {
  const tome = { id: 7, title: 'Dragons at Tea', priceCp: 1000, stock: 3 };
  const adjustments: { delta: number; reason: string }[] = [];
  const client: CatalogClient = {
    async getTome(id) {
      if (id !== tome.id) throw new HttpError(404, 'Tome not found');
      return { ...tome };
    },
    async adjustStock(id, delta, reason) {
      if (tome.stock + delta < 0) throw new HttpError(409, `Only ${tome.stock} left on the shelf`);
      tome.stock += delta;
      adjustments.push({ delta, reason });
      return { ...tome };
    },
  };
  return { client, tome, adjustments };
}

let db: Pool;
let app: FastifyInstance;
let catalog: ReturnType<typeof fakeCatalog>;

beforeAll(async () => {
  db = createPool(TEST_DATABASE_URL, 'patrons');
  await migrate(db, 'patrons', join(__dirname, '..', 'migrations'));
});

beforeEach(async () => {
  await db.query('TRUNCATE patrons, sales RESTART IDENTITY CASCADE');
  await db.query(`INSERT INTO patrons (name, race) VALUES ('Thrain Emberforge', 'dwarf'), ('Ilyana Moonwhisper', 'elf')`);
  catalog = fakeCatalog();
  app = buildApp({ db, jwtSecret: SECRET, catalog: catalog.client });
});

afterAll(async () => {
  await db.end();
});

describe('patrons', () => {
  it('lets a clerk register a new patron as a wanderer', async () => {
    const response = await app.inject({ method: 'POST', url: '/patrons', headers: clerk, payload: { name: 'Pim Butterburr', race: 'halfling' } });
    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({ name: 'Pim Butterburr', race: 'halfling', tier: 'wanderer' });
  });

  it('rejects a race the realm has never heard of', async () => {
    const response = await app.inject({ method: 'POST', url: '/patrons', headers: clerk, payload: { name: 'Zorp', race: 'martian' } });
    expect(response.statusCode).toBe(400);
  });

  it('lets only the owner change a membership tier', async () => {
    const asClerk = await app.inject({ method: 'PATCH', url: '/patrons/1', headers: clerk, payload: { tier: 'fellow' } });
    expect(asClerk.statusCode).toBe(403);
    const asOwner = await app.inject({ method: 'PATCH', url: '/patrons/1', headers: owner, payload: { tier: 'fellow' } });
    expect(asOwner.json().tier).toBe('fellow');
  });

  it('publishes head counts by race without any names', async () => {
    const response = await app.inject({ method: 'GET', url: '/public/patron-stats' });
    expect(response.json()).toEqual({
      totalPatrons: 2,
      byRace: [
        { race: 'dwarf', count: 1 },
        { race: 'elf', count: 1 },
      ],
    });
  });
});

describe('sales', () => {
  it('takes stock from the catalog and records the sale at the catalog price', async () => {
    const response = await app.inject({ method: 'POST', url: '/sales', headers: clerk, payload: { patronId: 1, tomeId: 7, quantity: 2 } });
    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({ tomeTitle: 'Dragons at Tea', quantity: 2, totalCp: 2000, soldBy: 'pip' });
    expect(catalog.adjustments).toEqual([{ delta: -2, reason: 'Sold to Thrain Emberforge' }]);

    const patron = await app.inject({ method: 'GET', url: '/patrons/1', headers: clerk });
    expect(patron.json().sales).toHaveLength(1);
  });

  it('records nothing when the catalog has too few copies', async () => {
    const response = await app.inject({ method: 'POST', url: '/sales', headers: clerk, payload: { patronId: 1, tomeId: 7, quantity: 4 } });
    expect(response.statusCode).toBe(409);
    const sales = await app.inject({ method: 'GET', url: '/sales', headers: clerk });
    expect(sales.json()).toEqual([]);
  });

  it('does not touch stock for a patron who does not exist', async () => {
    const response = await app.inject({ method: 'POST', url: '/sales', headers: clerk, payload: { patronId: 99, tomeId: 7, quantity: 1 } });
    expect(response.statusCode).toBe(404);
    expect(catalog.adjustments).toEqual([]);
  });

  it('shows the takings to the owner but not to a clerk', async () => {
    await app.inject({ method: 'POST', url: '/sales', headers: clerk, payload: { patronId: 2, tomeId: 7, quantity: 3 } });
    const asClerk = await app.inject({ method: 'GET', url: '/sales/summary', headers: clerk });
    expect(asClerk.statusCode).toBe(403);
    const asOwner = await app.inject({ method: 'GET', url: '/sales/summary', headers: owner });
    expect(asOwner.json()).toMatchObject({ allTimeCp: 3000, last7DaysCp: 3000, salesCount: 1 });
    expect(asOwner.json().bestSellers[0]).toEqual({ tomeTitle: 'Dragons at Tea', copies: 3, totalCp: 3000 });
  });
});
