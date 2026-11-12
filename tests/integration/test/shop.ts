import type { AddressInfo } from 'node:net';
import { join } from 'node:path';
import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import { createHttpCatalogClient, createPool, migrate, TEST_DATABASE_URL } from '@griffin/shared';
import { buildApp as buildCatalog } from '../../../services/catalog/src/app';
import { buildApp as buildGateway } from '../../../services/gateway/src/app';
import { demoStaff, seedStaff } from '../../../services/gateway/src/staff';
import { buildApp as buildIncidents } from '../../../services/incidents/src/app';
import { buildApp as buildPatrons } from '../../../services/patrons/src/app';

const SECRET = 'integration-secret';
const services = join(__dirname, '..', '..', '..', 'services');

export interface Shop {
  /** Where the catalog service is listening, for tests that talk to it directly. */
  catalogUrl: string;
  /** Calls the gateway over HTTP, the way the portal does. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- answers are whatever JSON came back; the tests check their shape
  call(method: string, path: string, options?: { token?: string; body?: unknown }): Promise<{ status: number; body: any }>;
  /** Signs in through the gateway and returns the token. */
  login(username: 'mirabel' | 'pip'): Promise<string>;
  /** Empties every table and puts a small, known shop in place. */
  reset(): Promise<void>;
  close(): Promise<void>;
}

async function listen(app: FastifyInstance): Promise<string> {
  await app.listen({ port: 0, host: '127.0.0.1' });
  return `http://127.0.0.1:${(app.server.address() as AddressInfo).port}`;
}

/**
 * Starts the whole shop in this process: the gateway and the three services,
 * each on a free port, talking to each other over real HTTP and keeping their
 * data in the test database. Only the browser and Docker are left out.
 */
export async function openShop(): Promise<Shop> {
  const pools: Record<'catalog' | 'patrons' | 'incidents' | 'auth', Pool> = {
    catalog: createPool(TEST_DATABASE_URL, 'catalog'),
    patrons: createPool(TEST_DATABASE_URL, 'patrons'),
    incidents: createPool(TEST_DATABASE_URL, 'incidents'),
    auth: createPool(TEST_DATABASE_URL, 'auth'),
  };
  await migrate(pools.catalog, 'catalog', join(services, 'catalog', 'migrations'));
  await migrate(pools.patrons, 'patrons', join(services, 'patrons', 'migrations'));
  await migrate(pools.incidents, 'incidents', join(services, 'incidents', 'migrations'));
  await migrate(pools.auth, 'auth', join(services, 'gateway', 'migrations'));

  const catalog = buildCatalog({ db: pools.catalog, jwtSecret: SECRET });
  const catalogUrl = await listen(catalog);
  const catalogClient = createHttpCatalogClient(catalogUrl);
  const patrons = buildPatrons({ db: pools.patrons, jwtSecret: SECRET, catalog: catalogClient });
  const incidents = buildIncidents({ db: pools.incidents, jwtSecret: SECRET, catalog: catalogClient });
  const gateway = buildGateway({
    db: pools.auth,
    jwtSecret: SECRET,
    services: { catalog: catalogUrl, patrons: await listen(patrons), incidents: await listen(incidents) },
  });
  const gatewayUrl = await listen(gateway);

  const shop: Shop = {
    catalogUrl,

    async call(method, path, { token, body } = {}) {
      const response = await fetch(`${gatewayUrl}${path}`, {
        method,
        headers: {
          ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
      return { status: response.status, body: await response.json().catch(() => null) };
    },

    async login(username) {
      const password = username === 'mirabel' ? 'griffin' : 'quill';
      const { status, body } = await shop.call('POST', '/api/auth/login', { body: { username, password } });
      if (status !== 200) throw new Error(`Could not sign in as ${username}: ${status}`);
      return body.token;
    },

    async reset() {
      await pools.catalog.query('TRUNCATE tomes, stock_adjustments RESTART IDENTITY CASCADE');
      await pools.patrons.query('TRUNCATE patrons, sales RESTART IDENTITY CASCADE');
      await pools.incidents.query('TRUNCATE incidents, wards RESTART IDENTITY CASCADE');
      await pools.auth.query('TRUNCATE staff RESTART IDENTITY');
      // Tome 7 matches the one tome that the fake catalog in @griffin/shared carries.
      await pools.catalog.query(
        `INSERT INTO tomes (id, title, author, genre, price_cp, stock, featured, restricted) VALUES
           (7, 'Dragons at Tea', 'Orsolya', 'bestiary', 1000, 3, TRUE, FALSE),
           (8, 'Forbidden Names', 'Voss', 'arcana', 9900, 1, TRUE, TRUE)`,
      );
      await pools.patrons.query(`INSERT INTO patrons (name, race) VALUES ('Thrain Emberforge', 'dwarf')`);
      await pools.incidents.query(
        `INSERT INTO wards (name, location, description, status) VALUES ('Threshold Rune', 'Front door', 'Wipe your feet.', 'holding')`,
      );
      await seedStaff(pools.auth, demoStaff({}));
    },

    async close() {
      await Promise.all([gateway, patrons, incidents, catalog].map((app) => app.close()));
      await Promise.all(Object.values(pools).map((pool) => pool.end()));
    },
  };
  return shop;
}
