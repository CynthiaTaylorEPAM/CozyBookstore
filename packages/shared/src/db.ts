import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Pool } from 'pg';

/**
 * Each service owns one Postgres schema (catalog, patrons, incidents, auth)
 * and never reads another service's tables. The pool's search_path is pinned
 * to that schema, so queries can use plain table names.
 */
export function createPool(databaseUrl: string, schema: string): Pool {
  return new Pool({ connectionString: databaseUrl, options: `-c search_path=${schema}`, max: 5 });
}

/**
 * Applies any `*.sql` files in `migrationsDir` that have not run yet, in
 * filename order. Each file runs once, inside a transaction.
 */
export async function migrate(pool: Pool, schema: string, migrationsDir: string): Promise<string[]> {
  const client = await pool.connect();
  const applied: string[] = [];
  try {
    // One migrator at a time per schema, in case two instances start together.
    await client.query('SELECT pg_advisory_lock(hashtext($1))', [`migrate:${schema}`]);
    await client.query(`CREATE SCHEMA IF NOT EXISTS ${schema}`);
    await client.query(
      `CREATE TABLE IF NOT EXISTS schema_migrations (
         name TEXT PRIMARY KEY,
         applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
       )`,
    );
    const done = new Set((await client.query('SELECT name FROM schema_migrations')).rows.map((r) => r.name));
    const files = readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();
    for (const file of files) {
      if (done.has(file)) continue;
      await client.query('BEGIN');
      try {
        await client.query(readFileSync(join(migrationsDir, file), 'utf8'));
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
        await client.query('COMMIT');
        applied.push(file);
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    }
    await client.query('SELECT pg_advisory_unlock(hashtext($1))', [`migrate:${schema}`]);
    return applied;
  } finally {
    client.release();
  }
}
