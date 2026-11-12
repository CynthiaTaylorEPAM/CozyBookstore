import { join } from 'node:path';
import type { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { CONDITIONS, createPool, GENRES, migrate, TEST_DATABASE_URL } from '@griffin/shared';

// A schema of its own, so the demo data is there to inspect and other tests are left alone.
const SCHEMA = 'catalog_seed_check';
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

describe('the demo catalog', () => {
  it('sets up from an empty database', async () => {
    const { rows } = await db.query('SELECT count(*)::int AS count FROM tomes');
    expect(rows[0].count).toBeGreaterThan(0);
  });

  it('only uses genres and conditions the shop knows', async () => {
    const { rows } = await db.query('SELECT DISTINCT genre, condition FROM tomes');
    for (const row of rows) {
      expect(GENRES).toContain(row.genre);
      expect(CONDITIONS).toContain(row.condition);
    }
  });

  it('has something to show in the shop window, and something locked away', async () => {
    const { rows } = await db.query(
      `SELECT count(*) FILTER (WHERE featured AND NOT restricted)::int AS shown,
              count(*) FILTER (WHERE restricted)::int AS locked FROM tomes`,
    );
    expect(rows[0].shown).toBeGreaterThan(0);
    expect(rows[0].locked).toBeGreaterThan(0);
  });
});
