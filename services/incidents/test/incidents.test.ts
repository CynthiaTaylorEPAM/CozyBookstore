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

  it('notes which tome was involved even when no copies were lost', async () => {
    const response = await app.inject({ method: 'POST', url: '/incidents', headers: clerk, payload: { ...sighting, tomeId: 7 } });
    expect(response.json()).toMatchObject({ tomeId: 7, tomeTitle: 'Dragons at Tea', copiesDamaged: 0 });
    expect(catalog.adjustments).toEqual([]);
  });

  it('logs nothing for a tome the catalog does not know', async () => {
    const response = await app.inject({ method: 'POST', url: '/incidents', headers: clerk, payload: { ...sighting, tomeId: 8, copiesDamaged: 1 } });
    expect(response.statusCode).toBe(404);
    expect((await db.query('SELECT 1 FROM incidents')).rowCount).toBe(0);
  });

  it('logs nothing, and says why, when the catalog is not answering', async () => {
    catalog.goDown();
    const response = await app.inject({ method: 'POST', url: '/incidents', headers: clerk, payload: { ...sighting, tomeId: 7, copiesDamaged: 1 } });
    expect(response.statusCode).toBe(503);
    expect((await db.query('SELECT 1 FROM incidents')).rowCount).toBe(0);
  });

  it('does not need the catalog at all for a plain sighting', async () => {
    catalog.goDown();
    const response = await app.inject({ method: 'POST', url: '/incidents', headers: clerk, payload: sighting });
    expect(response.statusCode).toBe(201);
  });

  it('passes the staff member\'s own token on to the catalog', async () => {
    await app.inject({ method: 'POST', url: '/incidents', headers: owner, payload: { ...sighting, tomeId: 7, copiesDamaged: 1 } });
    const token = owner.authorization.replace('Bearer ', '');
    expect(catalog.tokens).toEqual([token, token]);
  });

  // Known gap, the same kind as backlog item 14: if logging the incident fails
  // after the catalog has removed the damaged copies, the stock is not put back.
  it.todo('puts the stock back if the incident cannot be logged (see backlog 14)');

  it('insists on knowing which tome was damaged', async () => {
    const response = await app.inject({ method: 'POST', url: '/incidents', headers: clerk, payload: { ...sighting, copiesDamaged: 1 } });
    expect(response.statusCode).toBe(400);
  });

  it('rejects monsters that are not in the bestiary', async () => {
    const response = await app.inject({ method: 'POST', url: '/incidents', headers: clerk, payload: { ...sighting, monster: 'auditor' } });
    expect(response.statusCode).toBe(400);
  });
});

describe('the incident log and the wards', () => {
  beforeEach(async () => {
    await db.query(
      `INSERT INTO incidents (monster, severity, description, status, reported_by, reported_at) VALUES
         ('mimic', 'minor', 'Oldest, still open', 'open', 'pip', now() - interval '3 days'),
         ('ink imp', 'minor', 'Resolved yesterday', 'resolved', 'pip', now() - interval '1 day'),
         ('bookwyrm', 'dire', 'Newest, still open', 'open', 'pip', now())`,
    );
  });

  const descriptions = (response: { json(): { description: string }[] }) => response.json().map((i) => i.description);

  it('lists open incidents first, then the rest, newest first within each', async () => {
    const response = await app.inject({ method: 'GET', url: '/incidents', headers: clerk });
    expect(descriptions(response)).toEqual(['Newest, still open', 'Oldest, still open', 'Resolved yesterday']);
  });

  it('filters by open or resolved', async () => {
    const open = await app.inject({ method: 'GET', url: '/incidents?status=open', headers: clerk });
    expect(descriptions(open)).toEqual(['Newest, still open', 'Oldest, still open']);
    const resolved = await app.inject({ method: 'GET', url: '/incidents?status=resolved', headers: clerk });
    expect(descriptions(resolved)).toEqual(['Resolved yesterday']);
  });

  it('lists the wards with their descriptions for staff', async () => {
    const response = await app.inject({ method: 'GET', url: '/wards', headers: clerk });
    expect(response.json()).toEqual([
      { id: 1, name: 'Threshold Rune', location: 'Front door', description: 'Wipe your feet.', status: 'holding' },
    ]);
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

  it('takes the incident off the open count', async () => {
    await app.inject({ method: 'POST', url: '/incidents/1/resolve', headers: owner, payload: { resolution: 'Opened a window.' } });
    const status = await app.inject({ method: 'GET', url: '/public/shop-status' });
    expect(status.json()).toMatchObject({ mood: 'calm', openIncidents: 0 });
  });

  it('says so when the incident does not exist', async () => {
    const response = await app.inject({ method: 'POST', url: '/incidents/99/resolve', headers: owner, payload: { resolution: 'Nothing there.' } });
    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ error: 'Incident not found' });
  });

  it('keeps the first resolution when someone tries again', async () => {
    await app.inject({ method: 'POST', url: '/incidents/1/resolve', headers: owner, payload: { resolution: 'Opened a window.' } });
    await app.inject({ method: 'POST', url: '/incidents/1/resolve', headers: owner, payload: { resolution: 'Again.' } });
    const list = await app.inject({ method: 'GET', url: '/incidents', headers: owner });
    expect(list.json()[0].resolution).toBe('Opened a window.');
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

  it('turns wary when something is afoot but nothing is dire', async () => {
    await app.inject({ method: 'POST', url: '/incidents', headers: clerk, payload: { ...sighting, severity: 'troublesome' } });
    const response = await app.inject({ method: 'GET', url: '/public/shop-status' });
    expect(response.json()).toMatchObject({ mood: 'wary', openIncidents: 1 });
  });

  it('gives away nothing about who reported what', async () => {
    await app.inject({ method: 'POST', url: '/incidents', headers: clerk, payload: { ...sighting, description: 'Seen behind the till.' } });
    const response = await app.inject({ method: 'GET', url: '/public/shop-status' });
    for (const secret of ['pip', 'Seen behind the till', 'Wipe your feet']) expect(response.body).not.toContain(secret);
  });

  it('turns besieged when a dire incident is open', async () => {
    await app.inject({ method: 'POST', url: '/incidents', headers: clerk, payload: { ...sighting, severity: 'dire' } });
    const response = await app.inject({ method: 'GET', url: '/public/shop-status' });
    expect(response.json()).toMatchObject({ mood: 'besieged', openIncidents: 1 });
  });
});
