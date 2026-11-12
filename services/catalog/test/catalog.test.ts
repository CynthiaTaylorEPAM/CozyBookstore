import { join } from 'node:path';
import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createPool, migrate, signToken, TEST_DATABASE_URL } from '@griffin/shared';
import { buildApp } from '../src/app';

const SECRET = 'test-secret';
const owner = { authorization: `Bearer ${signToken({ id: 1, username: 'mirabel', displayName: 'Mirabel', role: 'owner' }, SECRET)}` };
const clerk = { authorization: `Bearer ${signToken({ id: 2, username: 'pip', displayName: 'Pip', role: 'clerk' }, SECRET)}` };

let db: Pool;
let app: FastifyInstance;

beforeAll(async () => {
  db = createPool(TEST_DATABASE_URL, 'catalog');
  await migrate(db, 'catalog', join(__dirname, '..', 'migrations'));
  app = buildApp({ db, jwtSecret: SECRET });
});

beforeEach(async () => {
  await db.query('TRUNCATE tomes, stock_adjustments RESTART IDENTITY CASCADE');
  await db.query(
    `INSERT INTO tomes (title, author, genre, price_cp, stock, featured, restricted) VALUES
       ('Dragons at Tea', 'Orsolya', 'bestiary', 1000, 3, TRUE, FALSE),
       ('Second Breakfast', 'Pim', 'cookery', 500, 0, FALSE, FALSE),
       ('Forbidden Names', 'Voss', 'arcana', 9900, 1, TRUE, TRUE)`,
  );
});

afterAll(async () => {
  await app.close();
  await db.end();
});

describe('browsing the shelves', () => {
  it('turns away anyone who is not signed in', async () => {
    const response = await app.inject({ method: 'GET', url: '/tomes' });
    expect(response.statusCode).toBe(401);
  });

  it('lists every tome for staff', async () => {
    const response = await app.inject({ method: 'GET', url: '/tomes', headers: clerk });
    expect(response.statusCode).toBe(200);
    expect(response.json().map((t: { title: string }) => t.title)).toEqual([
      'Dragons at Tea',
      'Forbidden Names',
      'Second Breakfast',
    ]);
  });

  it('searches by title or author and filters by genre', async () => {
    const byAuthor = await app.inject({ method: 'GET', url: '/tomes?q=pim', headers: clerk });
    expect(byAuthor.json()).toHaveLength(1);
    const byGenre = await app.inject({ method: 'GET', url: '/tomes?genre=bestiary', headers: clerk });
    expect(byGenre.json()[0].title).toBe('Dragons at Tea');
  });

  it('shows only featured, unrestricted tomes in the public shop window', async () => {
    const response = await app.inject({ method: 'GET', url: '/public/tomes' });
    expect(response.json().map((t: { title: string }) => t.title)).toEqual(['Dragons at Tea']);
  });

  it('keeps reorder levels out of the public shop window', async () => {
    const response = await app.inject({ method: 'GET', url: '/public/tomes' });
    for (const tome of response.json()) {
      expect(tome).not.toHaveProperty('reorderLevel');
      expect(tome).not.toHaveProperty('runningLow');
    }
  });

  it('gives every tome a reorder level of 2 unless told otherwise', async () => {
    const response = await app.inject({ method: 'GET', url: '/tomes', headers: clerk });
    expect(response.json().map((t: { reorderLevel: number }) => t.reorderLevel)).toEqual([2, 2, 2]);
  });
});

describe('managing the catalog', () => {
  const tome = { title: 'Stonesong', author: 'Thrain', genre: 'poetry', priceCp: 800, stock: 4 };

  it('lets the owner add a tome', async () => {
    const response = await app.inject({ method: 'POST', url: '/tomes', headers: owner, payload: tome });
    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({ title: 'Stonesong', priceCp: 800, stock: 4, condition: 'pristine' });
  });

  it('does not let a clerk add a tome', async () => {
    const response = await app.inject({ method: 'POST', url: '/tomes', headers: clerk, payload: tome });
    expect(response.statusCode).toBe(403);
  });

  it('rejects a tome with an unknown genre', async () => {
    const response = await app.inject({ method: 'POST', url: '/tomes', headers: owner, payload: { ...tome, genre: 'tax law' } });
    expect(response.statusCode).toBe(400);
  });

  it('lets the owner reprice a tome without touching anything else', async () => {
    await app.inject({ method: 'PATCH', url: '/tomes/1', headers: owner, payload: { reorderLevel: 5, description: 'Scones' } });
    const response = await app.inject({ method: 'PATCH', url: '/tomes/1', headers: owner, payload: { priceCp: 1200 } });
    expect(response.json()).toMatchObject({
      title: 'Dragons at Tea',
      priceCp: 1200,
      stock: 3,
      reorderLevel: 5,
      featured: true,
      description: 'Scones',
    });
  });

  it('gives a new tome a reorder level of 2 when none is given', async () => {
    const response = await app.inject({ method: 'POST', url: '/tomes', headers: owner, payload: tome });
    expect(response.json().reorderLevel).toBe(2);
  });

  it('lets the owner set a reorder level on a new tome', async () => {
    const response = await app.inject({ method: 'POST', url: '/tomes', headers: owner, payload: { ...tome, reorderLevel: 5 } });
    expect(response.statusCode).toBe(201);
    expect(response.json().reorderLevel).toBe(5);
  });

  it.each([-1, 1.5, 3000000000])('rejects a reorder level of %s', async (reorderLevel) => {
    const response = await app.inject({ method: 'POST', url: '/tomes', headers: owner, payload: { ...tome, reorderLevel } });
    expect(response.statusCode).toBe(400);
  });

  it('lets the owner set a reorder level of 0 and keeps it', async () => {
    const response = await app.inject({ method: 'PATCH', url: '/tomes/1', headers: owner, payload: { reorderLevel: 0 } });
    expect(response.json().reorderLevel).toBe(0);
    const reread = await app.inject({ method: 'GET', url: '/tomes/1', headers: clerk });
    expect(reread.json().reorderLevel).toBe(0);
  });

  it('does not let a clerk change a reorder level', async () => {
    const response = await app.inject({ method: 'PATCH', url: '/tomes/1', headers: clerk, payload: { reorderLevel: 5 } });
    expect(response.statusCode).toBe(403);
  });
});

describe('running low', () => {
  it.each([
    { level: 0, stock: 0, runningLow: true },
    { level: 0, stock: 1, runningLow: false },
    { level: 1, stock: 0, runningLow: true },
    { level: 1, stock: 1, runningLow: true },
    { level: 1, stock: 2, runningLow: false },
    { level: 5, stock: 4, runningLow: true },
    { level: 5, stock: 5, runningLow: true },
    { level: 5, stock: 6, runningLow: false },
  ])('is $runningLow at reorder level $level with $stock left', async ({ level, stock, runningLow }) => {
    await db.query('UPDATE tomes SET stock = $1 WHERE id = 1', [stock]);
    await app.inject({ method: 'PATCH', url: '/tomes/1', headers: owner, payload: { reorderLevel: level } });
    const response = await app.inject({ method: 'GET', url: '/tomes/1', headers: clerk });
    expect(response.json()).toMatchObject({ reorderLevel: level, runningLow });
  });

  it('is worked out again after a stock adjustment', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/tomes/1/stock-adjustments',
      headers: clerk,
      payload: { delta: -1, reason: 'Sold to Pim' },
    });
    expect(response.json()).toMatchObject({ stock: 2, reorderLevel: 2, runningLow: true });
  });
});

describe('adjusting stock', () => {
  it('moves stock and writes the change in the ledger', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/tomes/1/stock-adjustments',
      headers: clerk,
      payload: { delta: -2, reason: 'Sold to Thrain' },
    });
    expect(response.json().stock).toBe(1);
    const ledger = await app.inject({ method: 'GET', url: '/tomes/1/stock-adjustments', headers: clerk });
    expect(ledger.json()[0]).toMatchObject({ delta: -2, reason: 'Sold to Thrain', adjustedBy: 'pip' });
  });

  it('refuses to take more copies than are on the shelf', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/tomes/1/stock-adjustments',
      headers: clerk,
      payload: { delta: -4, reason: 'Eaten by bookwyrm' },
    });
    expect(response.statusCode).toBe(409);
    const tome = await app.inject({ method: 'GET', url: '/tomes/1', headers: clerk });
    expect(tome.json().stock).toBe(3);
  });

  it('says so when the tome does not exist', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/tomes/999/stock-adjustments',
      headers: clerk,
      payload: { delta: 1, reason: 'Delivery' },
    });
    expect(response.statusCode).toBe(404);
  });
});
