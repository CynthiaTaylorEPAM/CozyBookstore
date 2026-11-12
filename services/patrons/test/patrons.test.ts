import { join } from 'node:path';
import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createPool, fakeCatalog, type FakeCatalog, migrate, staffHeaders, TEST_DATABASE_URL, TEST_JWT_SECRET } from '@griffin/shared';
import { buildApp } from '../src/app';

const SECRET = TEST_JWT_SECRET;
const owner = staffHeaders('owner');
const clerk = staffHeaders('clerk');

let db: Pool;
let app: FastifyInstance;
let catalog: FakeCatalog;

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

  it('tidies a name and fills in empty home and notes', async () => {
    const response = await app.inject({ method: 'POST', url: '/patrons', headers: clerk, payload: { name: '  Grusha  ', race: 'orc' } });
    expect(response.json()).toMatchObject({ name: 'Grusha', home: '', notes: '' });
  });

  it('lists patrons by name with what each has spent', async () => {
    await app.inject({ method: 'POST', url: '/sales', headers: clerk, payload: { patronId: 1, tomeId: 7, quantity: 2 } });
    await app.inject({ method: 'POST', url: '/sales', headers: clerk, payload: { patronId: 1, tomeId: 7, quantity: 1 } });
    const response = await app.inject({ method: 'GET', url: '/patrons', headers: clerk });
    expect(response.json().map((p: { name: string; totalSpentCp: number }) => [p.name, p.totalSpentCp])).toEqual([
      ['Ilyana Moonwhisper', 0],
      ['Thrain Emberforge', 3000],
    ]);
  });

  it('shows a patron with an empty purchase history', async () => {
    const response = await app.inject({ method: 'GET', url: '/patrons/2', headers: clerk });
    expect(response.json()).toMatchObject({ name: 'Ilyana Moonwhisper', race: 'elf', tier: 'wanderer', sales: [] });
  });

  it('says so when a patron does not exist', async () => {
    const read = await app.inject({ method: 'GET', url: '/patrons/99', headers: clerk });
    expect(read.statusCode).toBe(404);
    expect(read.json()).toEqual({ error: 'Patron not found' });
    const change = await app.inject({ method: 'PATCH', url: '/patrons/99', headers: owner, payload: { tier: 'fellow' } });
    expect(change.statusCode).toBe(404);
  });

  it('changes notes without touching the tier', async () => {
    await app.inject({ method: 'PATCH', url: '/patrons/1', headers: owner, payload: { tier: 'regular' } });
    const response = await app.inject({ method: 'PATCH', url: '/patrons/1', headers: owner, payload: { notes: 'Likes ballads.' } });
    expect(response.json()).toMatchObject({ tier: 'regular', notes: 'Likes ballads.', name: 'Thrain Emberforge' });
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

  it('passes the staff member\'s own token on to the catalog', async () => {
    await app.inject({ method: 'POST', url: '/sales', headers: clerk, payload: { patronId: 1, tomeId: 7, quantity: 1 } });
    const token = clerk.authorization.replace('Bearer ', '');
    expect(catalog.tokens).toEqual([token, token]);
  });

  it('records nothing for a tome the catalog does not know', async () => {
    const response = await app.inject({ method: 'POST', url: '/sales', headers: clerk, payload: { patronId: 1, tomeId: 8, quantity: 1 } });
    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ error: 'Tome not found' });
    expect((await db.query('SELECT 1 FROM sales')).rowCount).toBe(0);
  });

  it('records nothing, and says why, when the catalog is not answering', async () => {
    catalog.goDown();
    const response = await app.inject({ method: 'POST', url: '/sales', headers: clerk, payload: { patronId: 1, tomeId: 7, quantity: 1 } });
    expect(response.statusCode).toBe(503);
    expect(response.json().error).toMatch(/catalog is not answering/);
    expect((await db.query('SELECT 1 FROM sales')).rowCount).toBe(0);
  });

  it('keeps the price paid on the day, even if the tome is repriced later', async () => {
    await app.inject({ method: 'POST', url: '/sales', headers: clerk, payload: { patronId: 1, tomeId: 7, quantity: 1 } });
    catalog.tome.priceCp = 2500;
    await app.inject({ method: 'POST', url: '/sales', headers: clerk, payload: { patronId: 1, tomeId: 7, quantity: 1 } });
    const patron = await app.inject({ method: 'GET', url: '/patrons/1', headers: clerk });
    expect(patron.json().sales.map((s: { unitPriceCp: number }) => s.unitPriceCp).sort()).toEqual([1000, 2500]);
  });

  it('lists the latest fifty sales, newest first, with the patron\'s name', async () => {
    await db.query(
      `INSERT INTO sales (patron_id, tome_id, tome_title, quantity, unit_price_cp, total_cp, sold_by, sold_at)
       SELECT 1, 7, 'Sale ' || n, 1, 100, 100, 'pip', now() - make_interval(mins => n)
         FROM generate_series(1, 55) AS n`,
    );
    const response = await app.inject({ method: 'GET', url: '/sales', headers: clerk });
    const sales = response.json();
    expect(sales).toHaveLength(50);
    expect(sales[0]).toMatchObject({ tomeTitle: 'Sale 1', patronName: 'Thrain Emberforge' });
    expect(sales[49].tomeTitle).toBe('Sale 50');
  });

  it('reports zero takings before the first sale', async () => {
    const response = await app.inject({ method: 'GET', url: '/sales/summary', headers: owner });
    expect(response.json()).toEqual({ allTimeCp: 0, last7DaysCp: 0, salesCount: 0, bestSellers: [] });
  });

  it('counts only the last seven days in the weekly takings', async () => {
    await db.query(
      `INSERT INTO sales (patron_id, tome_id, tome_title, quantity, unit_price_cp, total_cp, sold_by, sold_at) VALUES
         (1, 7, 'Old Sale', 1, 400, 400, 'pip', now() - interval '8 days'),
         (1, 7, 'Recent Sale', 1, 600, 600, 'pip', now() - interval '6 days')`,
    );
    const response = await app.inject({ method: 'GET', url: '/sales/summary', headers: owner });
    expect(response.json()).toMatchObject({ allTimeCp: 1000, last7DaysCp: 600, salesCount: 2 });
  });

  it('names the five best sellers by copies sold, then by takings', async () => {
    await db.query(
      `INSERT INTO sales (patron_id, tome_id, tome_title, quantity, unit_price_cp, total_cp, sold_by) VALUES
         (1, 1, 'A', 5, 100, 500, 'pip'),
         (1, 2, 'B', 3, 100, 300, 'pip'),
         (2, 2, 'B', 4, 100, 400, 'pip'),
         (1, 3, 'C', 5, 200, 1000, 'pip'),
         (1, 4, 'D', 1, 100, 100, 'pip'),
         (1, 5, 'E', 2, 100, 200, 'pip'),
         (1, 6, 'F', 1, 50, 50, 'pip')`,
    );
    const response = await app.inject({ method: 'GET', url: '/sales/summary', headers: owner });
    expect(response.json().bestSellers).toEqual([
      { tomeTitle: 'B', copies: 7, totalCp: 700 },
      { tomeTitle: 'C', copies: 5, totalCp: 1000 },
      { tomeTitle: 'A', copies: 5, totalCp: 500 },
      { tomeTitle: 'E', copies: 2, totalCp: 200 },
      { tomeTitle: 'D', copies: 1, totalCp: 100 },
    ]);
  });

  // Known gap, backlog item 14: if recording the sale fails after the catalog
  // has taken the copies off the shelf, the stock is not put back.
  it.todo('puts the stock back if the sale cannot be recorded (backlog 14)');

  it('shows the takings to the owner but not to a clerk', async () => {
    await app.inject({ method: 'POST', url: '/sales', headers: clerk, payload: { patronId: 2, tomeId: 7, quantity: 3 } });
    const asClerk = await app.inject({ method: 'GET', url: '/sales/summary', headers: clerk });
    expect(asClerk.statusCode).toBe(403);
    const asOwner = await app.inject({ method: 'GET', url: '/sales/summary', headers: owner });
    expect(asOwner.json()).toMatchObject({ allTimeCp: 3000, last7DaysCp: 3000, salesCount: 1 });
    expect(asOwner.json().bestSellers[0]).toEqual({ tomeTitle: 'Dragons at Tea', copies: 3, totalCp: 3000 });
  });
});
