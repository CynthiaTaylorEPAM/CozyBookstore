import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Fastify, { type FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createPool, migrate, staffHeaders, TEST_DATABASE_URL, TEST_JWT_SECRET } from '@griffin/shared';
import { buildApp, routingTable } from '../src/app';

/**
 * A stand-in for one backing service. It answers every request by saying
 * which service it is and what it was asked, so a test can see where the
 * gateway sent the request and what arrived.
 */
async function echoService(name: string): Promise<{ app: FastifyInstance; url: string }> {
  const app = Fastify();
  app.all('/*', async (request) => ({
    service: name,
    method: request.method,
    url: request.url,
    authorization: request.headers.authorization ?? null,
    body: request.body ?? null,
  }));
  await app.listen({ port: 0, host: '127.0.0.1' });
  return { app, url: `http://127.0.0.1:${(app.server.address() as AddressInfo).port}` };
}

let db: Pool;
let gateway: FastifyInstance;
let upstreams: { app: FastifyInstance; url: string }[];
let portalDir: string;

beforeAll(async () => {
  db = createPool(TEST_DATABASE_URL, 'auth');
  await migrate(db, 'auth', join(__dirname, '..', 'migrations'));
  upstreams = await Promise.all(['catalog', 'patrons', 'incidents'].map(echoService));
  portalDir = mkdtempSync(join(tmpdir(), 'griffin-portal-'));
  writeFileSync(join(portalDir, 'index.html'), '<!doctype html><title>The Gilded Griffin</title>');
  writeFileSync(join(portalDir, 'crest.svg'), '<svg xmlns="http://www.w3.org/2000/svg"/>');
  gateway = buildApp({
    db,
    jwtSecret: TEST_JWT_SECRET,
    services: { catalog: upstreams[0].url, patrons: upstreams[1].url, incidents: upstreams[2].url },
    portalDir,
  });
  await gateway.ready();
});

afterAll(async () => {
  await gateway.close();
  await Promise.all(upstreams.map((upstream) => upstream.app.close()));
  await db.end();
  rmSync(portalDir, { recursive: true });
});

describe('passing requests on to the service that owns them', () => {
  it.each([
    ['/api/public/tomes', 'catalog', '/public/tomes'],
    ['/api/public/patron-stats', 'patrons', '/public/patron-stats'],
    ['/api/public/shop-status', 'incidents', '/public/shop-status'],
    ['/api/tomes', 'catalog', '/tomes'],
    ['/api/tomes/7/stock-adjustments', 'catalog', '/tomes/7/stock-adjustments'],
    ['/api/tomes?q=dragons&genre=bestiary', 'catalog', '/tomes?q=dragons&genre=bestiary'],
    ['/api/patrons', 'patrons', '/patrons'],
    ['/api/patrons/3', 'patrons', '/patrons/3'],
    ['/api/sales', 'patrons', '/sales'],
    ['/api/sales/summary', 'patrons', '/sales/summary'],
    ['/api/incidents', 'incidents', '/incidents'],
    ['/api/incidents/2/resolve', 'incidents', '/incidents/2/resolve'],
    ['/api/wards', 'incidents', '/wards'],
  ])('%s goes to the %s service as %s', async (path, service, arrivesAs) => {
    const response = await gateway.inject({ method: 'GET', url: path });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ service, url: arrivesAs });
  });

  it('has a test above for every entry in the routing table', () => {
    const prefixes = routingTable({ catalog: 'c', patrons: 'p', incidents: 'i' }).map((route) => route.prefix);
    expect(prefixes.sort()).toEqual([
      '/api/incidents',
      '/api/patrons',
      '/api/public/patron-stats',
      '/api/public/shop-status',
      '/api/public/tomes',
      '/api/sales',
      '/api/tomes',
      '/api/wards',
    ]);
  });

  it('hands the staff token to the service untouched, leaving the checking to it', async () => {
    const headers = staffHeaders('clerk');
    const response = await gateway.inject({ method: 'GET', url: '/api/tomes', headers });
    expect(response.json().authorization).toBe(headers.authorization);
  });

  it('passes on the method and the body of a request', async () => {
    const response = await gateway.inject({
      method: 'POST',
      url: '/api/sales',
      headers: staffHeaders('clerk'),
      payload: { patronId: 1, tomeId: 7, quantity: 2 },
    });
    expect(response.json()).toMatchObject({ service: 'patrons', method: 'POST', body: { patronId: 1, tomeId: 7, quantity: 2 } });
  });

  it('answers 404 in the usual shape for an /api path nobody owns', async () => {
    const response = await gateway.inject({ method: 'GET', url: '/api/dragons' });
    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ error: 'No such door in this shop' });
  });

  it('keeps its own health check to itself', async () => {
    const response = await gateway.inject({ method: 'GET', url: '/health' });
    expect(response.json()).toEqual({ status: 'ok', service: 'gateway' });
  });
});

describe('serving the portal', () => {
  it('serves the front page', async () => {
    const response = await gateway.inject({ method: 'GET', url: '/' });
    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('The Gilded Griffin');
  });

  it('serves the portal\'s files', async () => {
    const response = await gateway.inject({ method: 'GET', url: '/crest.svg' });
    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('image/svg+xml');
  });

  it.each(['/login', '/shop', '/shop/tomes', '/shop/patrons/3'])(
    'serves the portal for its own page %s, so a refresh or a bookmark works',
    async (path) => {
      const response = await gateway.inject({ method: 'GET', url: path });
      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toContain('text/html');
      expect(response.body).toContain('The Gilded Griffin');
    },
  );

  it('does not answer a POST to a page with the portal', async () => {
    const response = await gateway.inject({ method: 'POST', url: '/shop/tomes' });
    expect(response.statusCode).toBe(404);
  });
});

describe('when a service is down', () => {
  it('reports the failure instead of hanging', async () => {
    const lonely = buildApp({
      db,
      jwtSecret: TEST_JWT_SECRET,
      // Port 9 on localhost: nothing is listening there.
      services: { catalog: 'http://127.0.0.1:9', patrons: upstreams[1].url, incidents: upstreams[2].url },
    });
    const response = await lonely.inject({ method: 'GET', url: '/api/tomes' });
    expect(response.statusCode).toBeGreaterThanOrEqual(500);
    const stillUp = await lonely.inject({ method: 'GET', url: '/api/patrons' });
    expect(stillUp.statusCode).toBe(200);
    await lonely.close();
  });
});
