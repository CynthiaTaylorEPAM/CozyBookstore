import { signToken } from './auth';
import type { CatalogClient, TomeSummary } from './catalogClient';
import type { Role } from './domain';
import { HttpError } from './errors';

/**
 * Helpers shared by every service's tests: ready-made staff tokens and a
 * stand-in for the catalog service. Nothing here is used when the shop runs.
 */
export const TEST_JWT_SECRET = 'test-secret';

const TEST_STAFF = {
  owner: { id: 1, username: 'mirabel', displayName: 'Mirabel', role: 'owner' },
  clerk: { id: 2, username: 'pip', displayName: 'Pip', role: 'clerk' },
} as const;

/** The token a signed-in owner or clerk would carry. */
export function testToken(role: Role, secret: string = TEST_JWT_SECRET): string {
  return signToken(TEST_STAFF[role], secret);
}

/** Request headers for a signed-in owner or clerk. */
export function staffHeaders(role: Role, secret: string = TEST_JWT_SECRET): { authorization: string } {
  return { authorization: `Bearer ${testToken(role, secret)}` };
}

export interface FakeCatalog {
  client: CatalogClient;
  /** The one tome on the fake shelf. Tests may change its price or stock. */
  tome: TomeSummary;
  /** Every stock change the service under test asked for. */
  adjustments: { delta: number; reason: string }[];
  /** Every token the service under test passed along. */
  tokens: string[];
  /** Makes every later call fail, as if the catalog service were down. */
  goDown(): void;
}

/**
 * Stands in for the catalog service: one tome (id 7), three copies on the shelf.
 * `tests/integration` checks that it answers the same way the real catalog does.
 */
export function fakeCatalog(): FakeCatalog {
  const tome: TomeSummary = { id: 7, title: 'Dragons at Tea', priceCp: 1000, stock: 3 };
  const adjustments: { delta: number; reason: string }[] = [];
  const tokens: string[] = [];
  let down = false;
  const checkUp = () => {
    if (down) throw new HttpError(503, 'The catalog is not answering — try again in a moment');
  };
  const client: CatalogClient = {
    async getTome(id, token) {
      checkUp();
      tokens.push(token);
      if (id !== tome.id) throw new HttpError(404, 'Tome not found');
      return { ...tome };
    },
    async adjustStock(id, delta, reason, token) {
      checkUp();
      tokens.push(token);
      if (id !== tome.id) throw new HttpError(404, 'Tome not found');
      if (tome.stock + delta < 0) throw new HttpError(409, `Only ${tome.stock} left on the shelf`);
      tome.stock += delta;
      adjustments.push({ delta, reason });
      return { ...tome };
    },
  };
  return {
    client,
    tome,
    adjustments,
    tokens,
    goDown: () => {
      down = true;
    },
  };
}

/**
 * Every route an app answers, as "METHOD /path" (for example "POST /tomes/:id").
 * The access tests use this to notice a new route that nobody wrote a rule for.
 * Call it after `await app.ready()`.
 */
export function listRoutes(app: { printRoutes(options: { commonPrefix: boolean }): string }): string[] {
  const routes: string[] = [];
  const parents: string[] = [];
  for (const line of app.printRoutes({ commonPrefix: false }).split('\n')) {
    // Each line looks like "    └── /:id (GET, HEAD, PATCH)"; four characters of indent per level.
    const match = /^([│ ]*)[├└]── (\S+)(?: \((.+)\))?$/.exec(line);
    if (!match) continue;
    const depth = match[1].length / 4;
    parents.length = depth;
    parents[depth] = match[2];
    const path = parents.join('');
    for (const method of (match[3] ?? '').split(', ')) {
      if (method && method !== 'HEAD') routes.push(`${method} ${path}`);
    }
  }
  return routes.sort();
}
