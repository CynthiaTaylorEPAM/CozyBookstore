import { join } from 'node:path';
import type { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createPool, migrate, MONSTERS, SEVERITIES, TEST_DATABASE_URL, WARD_STATUSES } from '@griffin/shared';

// A schema of its own, so the demo data is there to inspect and other tests are left alone.
const SCHEMA = 'incidents_seed_check';
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

describe('the demo incidents and wards', () => {
  it('sets up from an empty database', async () => {
    const { rows } = await db.query('SELECT (SELECT count(*) FROM incidents)::int AS incidents, (SELECT count(*) FROM wards)::int AS wards');
    expect(rows[0].incidents).toBeGreaterThan(0);
    expect(rows[0].wards).toBeGreaterThan(0);
  });

  it('only uses monsters, severities and statuses the shop knows', async () => {
    const incidents = await db.query('SELECT DISTINCT monster, severity, status FROM incidents');
    for (const row of incidents.rows) {
      expect(MONSTERS).toContain(row.monster);
      expect(SEVERITIES).toContain(row.severity);
      expect(['open', 'resolved']).toContain(row.status);
    }
    const wards = await db.query('SELECT DISTINCT status FROM wards');
    for (const row of wards.rows) expect(WARD_STATUSES).toContain(row.status);
  });

  it('records who resolved every resolved incident, and how', async () => {
    const { rows } = await db.query(
      `SELECT count(*)::int AS wrong FROM incidents
        WHERE (status = 'resolved') <> (resolved_by IS NOT NULL AND resolved_at IS NOT NULL AND resolution IS NOT NULL)`,
    );
    expect(rows[0].wrong).toBe(0);
  });
});
