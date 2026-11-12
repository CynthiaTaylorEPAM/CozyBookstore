import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Pool } from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { TEST_DATABASE_URL } from './config';
import { createPool, migrate } from './db';

// A schema of its own, so these tests never touch a real service's tables.
const SCHEMA = 'migrate_test';

let db: Pool;
let dir: string;

beforeAll(() => {
  db = createPool(TEST_DATABASE_URL, SCHEMA);
});

beforeEach(async () => {
  await db.query(`DROP SCHEMA IF EXISTS ${SCHEMA} CASCADE`);
  dir = mkdtempSync(join(tmpdir(), 'griffin-migrations-'));
});

afterAll(async () => {
  await db.query(`DROP SCHEMA IF EXISTS ${SCHEMA} CASCADE`);
  await db.end();
});

describe('migrate', () => {
  it('applies files in name order and ignores anything that is not .sql', async () => {
    writeFileSync(join(dir, '002_add_colour.sql'), 'ALTER TABLE hats ADD COLUMN colour TEXT');
    writeFileSync(join(dir, '001_create_hats.sql'), 'CREATE TABLE hats (id SERIAL PRIMARY KEY)');
    writeFileSync(join(dir, 'README.md'), 'not a migration');

    expect(await migrate(db, SCHEMA, dir)).toEqual(['001_create_hats.sql', '002_add_colour.sql']);
    await db.query(`INSERT INTO hats (colour) VALUES ('green')`);
    rmSync(dir, { recursive: true });
  });

  it('runs each file only once', async () => {
    writeFileSync(join(dir, '001_create_hats.sql'), 'CREATE TABLE hats (id SERIAL PRIMARY KEY)');
    await migrate(db, SCHEMA, dir);
    expect(await migrate(db, SCHEMA, dir)).toEqual([]);

    writeFileSync(join(dir, '002_add_colour.sql'), 'ALTER TABLE hats ADD COLUMN colour TEXT');
    expect(await migrate(db, SCHEMA, dir)).toEqual(['002_add_colour.sql']);
  });

  it('undoes a file that fails part-way, and does not record it', async () => {
    writeFileSync(join(dir, '001_create_hats.sql'), 'CREATE TABLE hats (id SERIAL PRIMARY KEY)');
    writeFileSync(join(dir, '002_broken.sql'), 'CREATE TABLE scarves (id SERIAL PRIMARY KEY); SELECT * FROM no_such_table');

    await expect(migrate(db, SCHEMA, dir)).rejects.toThrow(/no_such_table/);

    const recorded = await db.query('SELECT name FROM schema_migrations ORDER BY name');
    expect(recorded.rows.map((row) => row.name)).toEqual(['001_create_hats.sql']);
    const scarves = await db.query(`SELECT to_regclass('${SCHEMA}.scarves') AS found`);
    expect(scarves.rows[0].found).toBeNull();
  });

  it('can be run again after a failure is fixed', async () => {
    writeFileSync(join(dir, '001_broken.sql'), 'SELECT * FROM no_such_table');
    await expect(migrate(db, SCHEMA, dir)).rejects.toThrow();

    writeFileSync(join(dir, '001_broken.sql'), 'CREATE TABLE hats (id SERIAL PRIMARY KEY)');
    expect(await migrate(db, SCHEMA, dir)).toEqual(['001_broken.sql']);
  });
});
