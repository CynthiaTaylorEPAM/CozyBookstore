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
    const response = await app.inject({ method: 'PATCH', url: '/tomes/1', headers: owner, payload: { priceCp: 1200 } });
    expect(response.json()).toMatchObject({ title: 'Dragons at Tea', priceCp: 1200, stock: 3 });
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
