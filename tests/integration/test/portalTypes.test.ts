import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { openShop, type Shop } from './shop';

/**
 * The portal's types (apps/portal/src/types.ts) are written by hand. These
 * schemas say the same thing in a form that can be checked, and each test
 * holds a real answer from the API up against one of them. If a service
 * renames or drops a field the portal reads, this file fails.
 *
 * Keep the schemas in step with types.ts.
 */
const staff = z.object({ id: z.number(), username: z.string(), displayName: z.string(), role: z.enum(['owner', 'clerk']) });

const tome = z.object({
  id: z.number(),
  title: z.string(),
  author: z.string(),
  genre: z.string(),
  description: z.string(),
  priceCp: z.number().int(),
  stock: z.number().int(),
  condition: z.string(),
  restricted: z.boolean(),
  featured: z.boolean(),
  reorderLevel: z.number().int(),
  runningLow: z.boolean(),
});

// The public shop window leaves out the shop's own buying information.
const windowTome = tome.omit({ reorderLevel: true, runningLow: true }).strict();

const sale = z.object({
  id: z.number(),
  patronId: z.number(),
  patronName: z.string(),
  tomeId: z.number(),
  tomeTitle: z.string(),
  quantity: z.number().int(),
  totalCp: z.number().int(),
  soldBy: z.string(),
  soldAt: z.iso.datetime(),
});

const patron = z.object({
  id: z.number(),
  name: z.string(),
  race: z.string(),
  tier: z.string(),
  home: z.string(),
  notes: z.string(),
  joinedAt: z.iso.datetime(),
});

const salesSummary = z.object({
  allTimeCp: z.number().int(),
  last7DaysCp: z.number().int(),
  salesCount: z.number().int(),
  bestSellers: z.array(z.object({ tomeTitle: z.string(), copies: z.number().int(), totalCp: z.number().int() })),
});

const incident = z.object({
  id: z.number(),
  monster: z.string(),
  severity: z.enum(['minor', 'troublesome', 'dire']),
  description: z.string(),
  tomeTitle: z.string().nullable(),
  copiesDamaged: z.number().int(),
  status: z.enum(['open', 'resolved']),
  reportedBy: z.string(),
  reportedAt: z.iso.datetime(),
  resolvedBy: z.string().nullable(),
  resolution: z.string().nullable(),
});

const wardStatus = z.enum(['holding', 'flickering', 'broken']);
const staffWard = z.object({ id: z.number(), name: z.string(), location: z.string(), description: z.string(), status: wardStatus });

const shopStatus = z.object({
  mood: z.enum(['calm', 'wary', 'besieged']),
  openIncidents: z.number().int(),
  wards: z.array(z.object({ name: z.string(), location: z.string(), status: wardStatus })).min(1),
});

const patronStats = z.object({
  totalPatrons: z.number().int(),
  byRace: z.array(z.object({ race: z.string(), count: z.number().int() })).min(1),
});

let shop: Shop;
let pip: string;
let mirabel: string;

beforeAll(async () => {
  shop = await openShop();
  await shop.reset();
  pip = await shop.login('pip');
  mirabel = await shop.login('mirabel');
  // One of everything, so no list comes back empty.
  await shop.call('POST', '/api/sales', { token: pip, body: { patronId: 1, tomeId: 7, quantity: 1 } });
  await shop.call('POST', '/api/incidents', { token: pip, body: { monster: 'mimic', severity: 'minor', description: 'A suspicious footstool.' } });
  await shop.call('POST', '/api/incidents', { token: pip, body: { monster: 'bookwyrm', severity: 'dire', description: 'Chewing.', tomeId: 7, copiesDamaged: 1 } });
  await shop.call('POST', '/api/incidents/1/resolve', { token: mirabel, body: { resolution: 'Sat on it.' } });
});

afterAll(async () => {
  await shop.close();
});

/** Fetches a path and checks the answer against the portal's expectation of it. */
async function expectShape(path: string, schema: z.ZodType, token?: string) {
  const { status, body } = await shop.call('GET', path, { token });
  expect(status, path).toBe(200);
  const result = schema.safeParse(body);
  expect(result.error?.issues ?? [], `${path} does not match the portal's types`).toEqual([]);
}

describe('what the API sends matches what the portal expects', () => {
  it('Staff, from signing in and from /auth/me', async () => {
    const login = await shop.call('POST', '/api/auth/login', { body: { username: 'pip', password: 'quill' } });
    expect(z.object({ token: z.string(), staff }).safeParse(login.body).success).toBe(true);
    await expectShape('/api/auth/me', staff, pip);
  });

  it('Tome, in the list and on its own', async () => {
    await expectShape('/api/tomes', z.array(tome).min(1), pip);
    await expectShape('/api/tomes/7', tome, pip);
  });

  it('the shop window sends a Tome without the reorder level or the running-low flag', async () => {
    const { body } = await shop.call('GET', '/api/public/tomes');
    expect(body.length).toBeGreaterThan(0);
    for (const item of body) {
      expect(item).not.toHaveProperty('reorderLevel');
      expect(item).not.toHaveProperty('runningLow');
    }
    await expectShape('/api/public/tomes', z.array(windowTome.extend({ createdAt: z.iso.datetime() })).min(1));
  });

  it('Patron, in the list (with spending) and on its own (with sales)', async () => {
    await expectShape('/api/patrons', z.array(patron.extend({ totalSpentCp: z.number().int() })).min(1), pip);
    await expectShape('/api/patrons/1', patron.extend({ sales: z.array(sale).min(1) }), pip);
  });

  it('Sale, in the list and as the answer to ringing one up', async () => {
    await expectShape('/api/sales', z.array(sale).min(1), pip);
    const rungUp = await shop.call('POST', '/api/sales', { token: pip, body: { patronId: 1, tomeId: 7, quantity: 1 } });
    expect(sale.safeParse(rungUp.body).error?.issues ?? []).toEqual([]);
  });

  it('SalesSummary', async () => {
    await expectShape('/api/sales/summary', salesSummary, mirabel);
  });

  it('Incident, open and resolved', async () => {
    await expectShape('/api/incidents', z.array(incident).length(2), pip);
  });

  it('Ward, for staff', async () => {
    await expectShape('/api/wards', z.array(staffWard).min(1), pip);
  });

  it('ShopStatus and PatronStats, for the public page', async () => {
    await expectShape('/api/public/shop-status', shopStatus);
    await expectShape('/api/public/patron-stats', patronStats);
  });
});
