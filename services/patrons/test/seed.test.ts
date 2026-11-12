import { join } from 'node:path';
import type { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createPool, migrate, RACES, TEST_DATABASE_URL, TIERS } from '@griffin/shared';

// A schema of its own, so the demo data is there to inspect and other tests are left alone.
const SCHEMA = 'patrons_seed_check';
let db: Pool;

beforeAll(async () => {
  db = createPool(TEST_DATABASE_URL, SCHEMA);
  await db.query(`DROP SCHEMA IF EXISTS ${SCHEMA} CASCADE`);
  await migrate(db, SCHEMA, join(__dirname, '..', 'migrations'));
});

afterAll(async () => {
  await db.query(`DROP SCHEMA IF EXISTS ${SCHEMA} CASCADE`);
  await db.end();
});

describe('the demo guest book', () => {
  it('sets up from an empty database', async () => {
    const { rows } = await db.query('SELECT count(*)::int AS count FROM patrons');
    expect(rows[0].count).toBeGreaterThan(0);
  });

  it('only uses races and tiers the shop knows', async () => {
    const { rows } = await db.query('SELECT DISTINCT race, tier FROM patrons');
    for (const row of rows) {
      expect(RACES).toContain(row.race);
      expect(TIERS).toContain(row.tier);
    }
  });

  it('has demo sales whose totals add up', async () => {
    const { rows } = await db.query('SELECT count(*)::int AS wrong FROM sales WHERE total_cp <> unit_price_cp * quantity');
    expect(rows[0].wrong).toBe(0);
  });
});
