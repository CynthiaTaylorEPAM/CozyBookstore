import { expect, type APIRequestContext, type Page } from '@playwright/test';

/** The two demo accounts. Passwords can be overridden to match the shop under test. */
const STAFF = {
  mirabel: { password: process.env.OWNER_PASSWORD ?? 'griffin', firstName: 'Mirabel' },
  pip: { password: process.env.CLERK_PASSWORD ?? 'quill', firstName: 'Pip' },
};
export type StaffName = keyof typeof STAFF;

/** Signs in through the login page, the way a person would. */
export async function signIn(page: Page, who: StaffName): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Name').fill(who);
  await page.getByLabel('Password').fill(STAFF[who].password);
  await page.getByRole('button', { name: 'Come in' }).click();
  await expect(page.getByRole('heading', { name: `Good day, ${STAFF[who].firstName}` })).toBeVisible();
}

/**
 * Every name a journey gives to the tomes, patrons and incidents it makes.
 * The tidy-up removes only rows named one of these plus a `unique()` suffix,
 * so a new journey name must be added here.
 */
export const JOURNEY_NAMES = [
  'Window Tome', 'Cabinet Tome', 'Stonesong', 'Risky Tome', 'Popular Tome',
  'Loyal', 'Rattling in the stacks', 'Takings Tome', 'Spender', 'Fizzwick', 'Sale Tome', 'Buyer',
  'Scarce Tome', 'Latecomer', 'Gone Tome', 'Restock Tome', 'Chewed Tome', 'Crumbs everywhere',
  'Fixed Price Tome', 'Hopeful',
] as const;
export type JourneyName = (typeof JOURNEY_NAMES)[number];

/** What `unique()` adds after the space: 8 base-36 time characters and 1-2 random ones. */
const SUFFIX_PATTERN = '[0-9a-z]{9,}';

/**
 * A name nobody has used before, so each journey works on its own tome or
 * patron and does not depend on the demo data or on other journeys.
 */
export function unique(name: JourneyName): string {
  return `${name} ${Date.now().toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`;
}

const escapeRegex = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Matches a whole journey-made name. Works both in a JavaScript RegExp and with Postgres `~`. */
export const JOURNEY_ROW_PATTERN = `^(${JOURNEY_NAMES.map(escapeRegex).join('|')}) ${SUFFIX_PATTERN}$`;

/** True when `text` is exactly a journey name plus a `unique()` suffix. */
export function isJourneyRow(text: string): boolean {
  return new RegExp(JOURNEY_ROW_PATTERN).test(text);
}

/**
 * Talks to the shop's API directly. Journeys use this to set the scene
 * (a tome with three copies, a patron to sell to) before the browser takes over.
 */
export async function backstage(request: APIRequestContext, who: StaffName) {
  const login = await request.post('/api/auth/login', { data: { username: who, password: STAFF[who].password } });
  expect(login.ok(), 'signing in backstage').toBe(true);
  const headers = { authorization: `Bearer ${(await login.json()).token}` };

  const send = async (method: 'get' | 'post' | 'patch', path: string, data?: object) => {
    const response = await request[method](`/api${path}`, { headers, data });
    return { status: response.status(), body: await response.json() };
  };

  return {
    get: (path: string) => send('get', path),
    post: (path: string, data: object) => send('post', path, data),
    patch: (path: string, data: object) => send('patch', path, data),
    async addTome(details: { title: string; stock?: number; priceCp?: number; featured?: boolean; restricted?: boolean }) {
      const tome = await send('post', '/tomes', { author: 'A. Scribe', genre: 'history', priceCp: 1000, stock: 3, ...details });
      expect(tome.status, 'adding a tome backstage').toBe(201);
      return tome.body as { id: number; title: string; stock: number };
    },
    async addPatron(name: string) {
      const patron = await send('post', '/patrons', { name, race: 'gnome' });
      expect(patron.status, 'registering a patron backstage').toBe(201);
      return patron.body as { id: number; name: string };
    },
  };
}

/** The row for one tome on the Tomes page, found by searching for its title. */
export async function findTome(page: Page, title: string) {
  await page.getByRole('link', { name: /Tomes/ }).click();
  await page.getByPlaceholder(/Search by title or author/).fill(title);
  const row = page.getByRole('row', { name: new RegExp(title) });
  await expect(row).toBeVisible();
  return row;
}
