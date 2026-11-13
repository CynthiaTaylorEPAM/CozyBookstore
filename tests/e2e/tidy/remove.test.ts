import { join } from 'node:path';
import pg from 'pg';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createPool, migrate, TEST_DATABASE_URL } from '@griffin/shared';
import { unique } from '../journeys/shop';
import { HANDLED_TABLES, NO_JOURNEY_DATA_TABLES, removeJourneyRows } from './remove';

const services = join(__dirname, '..', '..', '..', 'services');
const SCHEMAS = { catalog: 'catalog', patrons: 'patrons', incidents: 'incidents', auth: 'gateway' } as const;

let client: pg.Client;
/** Rows this file inserted, so afterEach can remove whatever is left of them. */
const made = { tomes: [] as number[], patrons: [] as number[], sales: [] as number[], incidents: [] as number[] };

beforeAll(async () => {
  for (const [schema, service] of Object.entries(SCHEMAS)) {
    const pool = createPool(TEST_DATABASE_URL, schema);
    try {
      await migrate(pool, schema, join(services, service, 'migrations'));
    } finally {
      await pool.end();
    }
  }
  client = new pg.Client({ connectionString: TEST_DATABASE_URL });
  await client.connect();
});

afterEach(async () => {
  await client.query('DELETE FROM patrons.sales WHERE id = ANY($1)', [made.sales]);
  await client.query('DELETE FROM incidents.incidents WHERE id = ANY($1)', [made.incidents]);
  await client.query('DELETE FROM catalog.tomes WHERE id = ANY($1)', [made.tomes]);
  await client.query('DELETE FROM patrons.patrons WHERE id = ANY($1)', [made.patrons]);
  for (const ids of Object.values(made)) ids.length = 0;
});

afterAll(async () => {
  await client?.end();
});

/**
 * Other test files insert rows with fixed ids without moving the id sequence,
 * so this file picks its own ids above the current highest and leaves the
 * sequences as it found them.
 */
const nextId = (table: string) => `(SELECT COALESCE(MAX(id), 0) + 1 FROM ${table})`;

async function addTome(title: string): Promise<number> {
  const { rows } = await client.query(
    `INSERT INTO catalog.tomes (id, title, author, genre, price_cp, stock) VALUES (${nextId('catalog.tomes')}, $1, 'A. Scribe', 'history', 1000, 3) RETURNING id`,
    [title],
  );
  made.tomes.push(rows[0].id);
  return rows[0].id;
}

async function addPatron(name: string): Promise<number> {
  const { rows } = await client.query(`INSERT INTO patrons.patrons (id, name, race) VALUES (${nextId('patrons.patrons')}, $1, 'gnome') RETURNING id`, [name]);
  made.patrons.push(rows[0].id);
  return rows[0].id;
}

async function addSale(patronId: number, tomeId: number, tomeTitle: string): Promise<number> {
  const { rows } = await client.query(
    `INSERT INTO patrons.sales (id, patron_id, tome_id, tome_title, quantity, unit_price_cp, total_cp, sold_by)
     VALUES (${nextId('patrons.sales')}, $1, $2, $3, 1, 1000, 1000, 'pip') RETURNING id`,
    [patronId, tomeId, tomeTitle],
  );
  made.sales.push(rows[0].id);
  return rows[0].id;
}

async function addIncident(description: string, tome?: { id: number; title: string }): Promise<number> {
  const { rows } = await client.query(
    `INSERT INTO incidents.incidents (id, monster, severity, description, tome_id, tome_title, reported_by)
     VALUES (${nextId('incidents.incidents')}, 'bookwyrm', 'minor', $1, $2, $3, 'pip') RETURNING id`,
    [description, tome?.id ?? null, tome?.title ?? null],
  );
  made.incidents.push(rows[0].id);
  return rows[0].id;
}

async function exists(table: string, id: number): Promise<boolean> {
  const { rowCount } = await client.query(`SELECT 1 FROM ${table} WHERE id = $1`, [id]);
  return rowCount === 1;
}

/** A journey tome with a stock adjustment, a journey patron, two sales and an incident. */
async function addJourneyScene() {
  const title = unique('Sale Tome');
  const tome = await addTome(title);
  const { rows } = await client.query(
    `INSERT INTO catalog.stock_adjustments (id, tome_id, delta, reason, adjusted_by) VALUES (${nextId('catalog.stock_adjustments')}, $1, 3, 'restock', 'mirabel') RETURNING id`,
    [tome],
  );
  const buyer = await addPatron(unique('Buyer'));
  const demoPatron = await addPatron('Loyal Grusha');
  return {
    tome,
    adjustment: rows[0].id as number,
    buyer,
    demoPatron,
    buyerSale: await addSale(buyer, tome, title),
    demoSale: await addSale(demoPatron, tome, title),
    incident: await addIncident(unique('Crumbs everywhere')),
    tomeIncident: await addIncident('Chewed at the corners', { id: tome, title }),
  };
}

describe('removing the rows the browser journeys made', () => {
  it('removes journey rows and what hangs off them, and keeps the demo patron', async () => {
    const scene = await addJourneyScene();

    const counts = await removeJourneyRows(client);

    expect(counts).toEqual({ sales: 2, incidents: 2, tomes: 1, patrons: 1 });
    expect(await exists('catalog.tomes', scene.tome)).toBe(false);
    expect(await exists('catalog.stock_adjustments', scene.adjustment)).toBe(false);
    expect(await exists('patrons.patrons', scene.buyer)).toBe(false);
    expect(await exists('patrons.sales', scene.buyerSale)).toBe(false);
    expect(await exists('patrons.sales', scene.demoSale)).toBe(false);
    expect(await exists('incidents.incidents', scene.incident)).toBe(false);
    expect(await exists('incidents.incidents', scene.tomeIncident)).toBe(false);
    expect(await exists('patrons.patrons', scene.demoPatron)).toBe(true);
  });

  it('keeps lookalike rows that have no journey suffix', async () => {
    const tome = await addTome('Sale Tome');
    const doom = await addTome('Window Tome of Doom');
    const patron = await addPatron('Buyer Brightwater');
    const sale = await addSale(patron, tome, 'Sale Tome');
    const incident = await addIncident('Crumbs everywhere', { id: tome, title: 'Sale Tome' });

    await removeJourneyRows(client);

    for (const [table, id] of [
      ['catalog.tomes', tome],
      ['catalog.tomes', doom],
      ['patrons.patrons', patron],
      ['patrons.sales', sale],
      ['incidents.incidents', incident],
    ] as const) {
      expect(await exists(table, id), `${table} ${id}`).toBe(true);
    }
  });

  it('removes nothing when a step fails partway', async () => {
    const scene = await addJourneyScene();
    let calls = 0;
    const failing = {
      query: (...args: Parameters<pg.Client['query']>) => {
        calls += 1;
        if (calls === 3) return Promise.reject(new Error('the ink ran dry'));
        return (client.query as (...a: unknown[]) => Promise<pg.QueryResult>)(...args);
      },
    } as unknown as pg.ClientBase;

    await expect(removeJourneyRows(failing)).rejects.toThrow('the ink ran dry');

    expect(await exists('catalog.tomes', scene.tome)).toBe(true);
    expect(await exists('patrons.patrons', scene.buyer)).toBe(true);
    expect(await exists('patrons.sales', scene.buyerSale)).toBe(true);
    expect(await exists('patrons.sales', scene.demoSale)).toBe(true);
    expect(await exists('incidents.incidents', scene.incident)).toBe(true);
  });

  it('knows about every table, so a new one cannot be missed', async () => {
    const { rows } = await client.query(
      `SELECT table_schema || '.' || table_name AS name FROM information_schema.tables
       WHERE table_type = 'BASE TABLE' AND table_schema = ANY($1) ORDER BY 1`,
      [Object.keys(SCHEMAS)],
    );
    const known = new Set([...HANDLED_TABLES, ...NO_JOURNEY_DATA_TABLES]);
    const unlisted = rows.map((row) => row.name as string).filter((name) => !known.has(name));

    expect(
      unlisted,
      `${unlisted.join(', ')} needs a tidy-up step in tests/e2e/tidy/remove.ts, or a no-journey-data entry there if journeys never write to it`,
    ).toEqual([]);
  });
});
