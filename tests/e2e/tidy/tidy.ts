import pg from 'pg';
import { DEV_DATABASE_URL } from '@griffin/shared';
import { removeJourneyRows } from './remove';

export type TidyDecision = { run: true; databaseUrl: string; host: string } | { run: false; message: string };

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1']);

/** The host name in an address, or undefined when the address cannot be read. */
function hostOf(address: string): string | undefined {
  try {
    return new URL(address).hostname;
  } catch {
    return undefined;
  }
}

/**
 * Whether the tidy-up may run. Only a shop and a database on this machine
 * are tidied; anything else is left alone. DATABASE_URL is never read, and
 * messages name a host only, never a whole address.
 */
export function decideTidy(env: NodeJS.ProcessEnv): TidyDecision {
  if (env.E2E_KEEP_DATA === '1') {
    return { run: false, message: "Tidy-up skipped: E2E_KEEP_DATA=1 keeps the journeys' tomes and patrons for you to inspect." };
  }

  const shopHost = hostOf(env.E2E_BASE_URL ?? 'http://localhost:8080');
  if (shopHost === undefined) {
    return { run: false, message: 'Tidy-up skipped: E2E_BASE_URL is not an address the griffin can read, so nothing was touched.' };
  }
  if (!LOCAL_HOSTS.has(shopHost)) {
    return { run: false, message: `Tidy-up skipped: the shop at ${shopHost} is not on this machine, so its shelves are left alone.` };
  }

  const databaseUrl = env.E2E_DATABASE_URL ?? DEV_DATABASE_URL;
  const host = hostOf(databaseUrl);
  if (host === undefined) {
    return { run: false, message: 'Tidy-up skipped: E2E_DATABASE_URL is not an address the griffin can read, so nothing was touched.' };
  }
  // pg lets a `host` or `hostaddr` query parameter override the address's
  // host name, so each of those must be on this machine too.
  const params = new URL(databaseUrl).searchParams;
  const hosts = [host, ...params.getAll('host'), ...params.getAll('hostaddr')];
  const remote = hosts.find((candidate) => !LOCAL_HOSTS.has(candidate));
  if (remote !== undefined) {
    return { run: false, message: `Tidy-up skipped: the database at ${remote} is not on this machine, so its rows are left alone.` };
  }
  return { run: true, databaseUrl, host };
}

/**
 * Removes the journeys' rows before (`start`) or after (`end`) a browser run.
 * It never rejects: any problem becomes one warning line, so the tidy-up can
 * never change whether the journeys pass.
 */
export async function runTidyUp(
  when: 'start' | 'end',
  env: NodeJS.ProcessEnv = process.env,
  log: (line: string) => void = console.log,
): Promise<void> {
  let host = 'the database';
  try {
    const decision = decideTidy(env);
    if (!decision.run) {
      // The start hook already said E2E_KEEP_DATA=1 skipped the run; saying it again at the end is noise.
      if (!(when === 'end' && env.E2E_KEEP_DATA === '1')) log(decision.message);
      return;
    }
    host = decision.host;
    const client = new pg.Client({
      connectionString: decision.databaseUrl,
      connectionTimeoutMillis: 3000,
      statement_timeout: 5000,
      query_timeout: 5000,
    });
    try {
      await client.connect();
      const counts = await removeJourneyRows(client);
      const moment = when === 'start' ? 'before the journeys' : 'after the journeys';
      log(
        `Tidy-up ${moment}: swept away ${counts.tomes} tomes, ${counts.patrons} patrons, ${counts.sales} sales and ${counts.incidents} incidents at ${host}.`,
      );
    } finally {
      await client.end().catch(() => undefined);
    }
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    log(`Tidy-up warning: could not tidy the database at ${host} (${reason}). The journeys' results are not affected.`);
  }
}
