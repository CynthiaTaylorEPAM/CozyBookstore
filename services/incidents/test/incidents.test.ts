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

const sighting = { monster: 'dust wraith', severity: 'minor', description: 'Sneezing on the top shelf.' };

beforeAll(async () => {
  db = createPool(TEST_DATABASE_URL, 'incidents');
  await migrate(db, 'incidents', join(__dirname, '..', 'migrations'));
});

beforeEach(async () => {
  await db.query('TRUNCATE incidents, wards RESTART IDENTITY CASCADE');
  await db.query(`INSERT INTO wards (name, location, description, status) VALUES ('Threshold Rune', 'Front door', 'Wipe your feet.', 'holding')`);
  catalog = fakeCatalog();
  app = buildApp({ db, jwtSecret: SECRET, catalog: catalog.client });
});

afterAll(async () => {
  await db.end();
});

describe('reporting an incident', () => {
  it('lets a clerk report a sighting with no damage', async () => {
    const response = await app.inject({ method: 'POST', url: '/incidents', headers: clerk, payload: sighting });
    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({ monster: 'dust wraith', status: 'open', reportedBy: 'pip', copiesDamaged: 0 });
    expect(catalog.adjustments).toEqual([]);
  });

  it('removes damaged copies from the catalog', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/incidents',
      headers: clerk,
      payload: { monster: 'bookwyrm', severity: 'troublesome', description: 'Chewed through the bestiaries.', tomeId: 7, copiesDamaged: 2 },
    });
    expect(response.json()).toMatchObject({ tomeTitle: 'Dragons at Tea', copiesDamaged: 2 });
    expect(catalog.adjustments).toEqual([{ delta: -2, reason: 'Damaged by bookwyrm' }]);
  });

  it('logs nothing if more copies are claimed damaged than exist', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/incidents',
      headers: clerk,
      payload: { monster: 'bookwyrm', severity: 'dire', description: 'A feast.', tomeId: 7, copiesDamaged: 10 },
    });
    expect(response.statusCode).toBe(409);
    const list = await app.inject({ method: 'GET', url: '/incidents', headers: clerk });
    expect(list.json()).toEqual([]);
  });

  it('insists on knowing which tome was damaged', async () => {
    const response = await app.inject({ method: 'POST', url: '/incidents', headers: clerk, payload: { ...sighting, copiesDamaged: 1 } });
    expect(response.statusCode).toBe(400);
  });

  it('rejects monsters that are not in the bestiary', async () => {
    const response = await app.inject({ method: 'POST', url: '/incidents', headers: clerk, payload: { ...sighting, monster: 'auditor' } });
    expect(response.statusCode).toBe(400);
  });
});

describe('resolving an incident', () => {
  beforeEach(async () => {
    await app.inject({ method: 'POST', url: '/incidents', headers: clerk, payload: sighting });
  });

  it('is for the owner only', async () => {
    const response = await app.inject({ method: 'POST', url: '/incidents/1/resolve', headers: clerk, payload: { resolution: 'Shooed it.' } });
    expect(response.statusCode).toBe(403);
  });

  it('records who resolved it and how', async () => {
    const response = await app.inject({ method: 'POST', url: '/incidents/1/resolve', headers: owner, payload: { resolution: 'Opened a window.' } });
    expect(response.json()).toMatchObject({ status: 'resolved', resolvedBy: 'mirabel', resolution: 'Opened a window.' });
  });

  it('cannot be done twice', async () => {
    await app.inject({ method: 'POST', url: '/incidents/1/resolve', headers: owner, payload: { resolution: 'Opened a window.' } });
    const again = await app.inject({ method: 'POST', url: '/incidents/1/resolve', headers: owner, payload: { resolution: 'Again.' } });
    expect(again.statusCode).toBe(409);
  });
});

describe('public shop status', () => {
  it('is calm with no open incidents, and lists the wards', async () => {
    const response = await app.inject({ method: 'GET', url: '/public/shop-status' });
    expect(response.json()).toEqual({
      mood: 'calm',
      openIncidents: 0,
      wards: [{ name: 'Threshold Rune', location: 'Front door', status: 'holding' }],
    });
  });

  it('turns besieged when a dire incident is open', async () => {
    await app.inject({ method: 'POST', url: '/incidents', headers: clerk, payload: { ...sighting, severity: 'dire' } });
    const response = await app.inject({ method: 'GET', url: '/public/shop-status' });
    expect(response.json()).toMatchObject({ mood: 'besieged', openIncidents: 1 });
  });
});
