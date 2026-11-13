import type pg from 'pg';
import { JOURNEY_ROW_PATTERN } from '../journeys/shop';

/** How many rows of each kind one tidy-up removed. */
export interface RemovalCounts {
  sales: number;
  incidents: number;
  tomes: number;
  patrons: number;
}

/**
 * Tables the tidy-up clears journey rows from. Stock adjustments go with
 * their tome (the catalog's foreign key cascades).
 */
export const HANDLED_TABLES: readonly string[] = [
  'catalog.tomes',
  'catalog.stock_adjustments',
  'patrons.patrons',
  'patrons.sales',
  'incidents.incidents',
];

/** Tables the journeys never write to, so the tidy-up leaves them alone. */
export const NO_JOURNEY_DATA_TABLES: readonly string[] = [
  'incidents.wards',
  'auth.staff',
  'catalog.schema_migrations',
  'patrons.schema_migrations',
  'incidents.schema_migrations',
  'auth.schema_migrations',
];

const JOURNEY_TOME_IDS = 'SELECT id FROM catalog.tomes WHERE title ~ $1';
const JOURNEY_PATRON_IDS = 'SELECT id FROM patrons.patrons WHERE name ~ $1';

/**
 * Removes every tome, patron, sale and incident a browser journey made, and
 * nothing else, in one transaction: a failure partway removes nothing.
 * Sales and incidents go first because they point at tomes and patrons.
 */
export async function removeJourneyRows(client: pg.ClientBase): Promise<RemovalCounts> {
  const params = [JOURNEY_ROW_PATTERN];
  await client.query('BEGIN');
  try {
    const sales = await client.query(
      `DELETE FROM patrons.sales
       WHERE tome_id IN (${JOURNEY_TOME_IDS}) OR tome_title ~ $1 OR patron_id IN (${JOURNEY_PATRON_IDS})`,
      params,
    );
    const incidents = await client.query(
      `DELETE FROM incidents.incidents
       WHERE tome_id IN (${JOURNEY_TOME_IDS}) OR tome_title ~ $1 OR description ~ $1`,
      params,
    );
    const tomes = await client.query('DELETE FROM catalog.tomes WHERE title ~ $1', params);
    const patrons = await client.query('DELETE FROM patrons.patrons WHERE name ~ $1', params);
    await client.query('COMMIT');
    return {
      sales: sales.rowCount ?? 0,
      incidents: incidents.rowCount ?? 0,
      tomes: tomes.rowCount ?? 0,
      patrons: patrons.rowCount ?? 0,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}
