import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { openShop, type Shop } from './shop';

let shop: Shop;
let pip: string;
let mirabel: string;

beforeAll(async () => {
  shop = await openShop();
});

beforeEach(async () => {
  await shop.reset();
  pip = await shop.login('pip');
  mirabel = await shop.login('mirabel');
});

afterAll(async () => {
  await shop.close();
});

const stockOf = async (tomeId: number) => (await shop.call('GET', `/api/tomes/${tomeId}`, { token: pip })).body.stock;
const ledgerOf = async (tomeId: number) => (await shop.call('GET', `/api/tomes/${tomeId}/stock-adjustments`, { token: pip })).body;

describe('ringing up a sale', () => {
  it('takes the copies off the shelf, writes the ledger and records the sale', async () => {
    const sale = await shop.call('POST', '/api/sales', { token: pip, body: { patronId: 1, tomeId: 7, quantity: 2 } });
    expect(sale.status).toBe(201);
    expect(sale.body).toMatchObject({ tomeTitle: 'Dragons at Tea', unitPriceCp: 1000, totalCp: 2000, soldBy: 'pip', patronName: 'Thrain Emberforge' });

    expect(await stockOf(7)).toBe(1);
    expect(await ledgerOf(7)).toMatchObject([{ delta: -2, reason: 'Sold to Thrain Emberforge', adjustedBy: 'pip' }]);

    const patron = await shop.call('GET', '/api/patrons/1', { token: pip });
    expect(patron.body.sales).toHaveLength(1);

    const takings = await shop.call('GET', '/api/sales/summary', { token: mirabel });
    expect(takings.body).toMatchObject({ allTimeCp: 2000, salesCount: 1, bestSellers: [{ tomeTitle: 'Dragons at Tea', copies: 2, totalCp: 2000 }] });
  });

  it('charges the price in the catalog at the moment of sale', async () => {
    await shop.call('PATCH', '/api/tomes/7', { token: mirabel, body: { priceCp: 1250 } });
    const sale = await shop.call('POST', '/api/sales', { token: pip, body: { patronId: 1, tomeId: 7, quantity: 1 } });
    expect(sale.body).toMatchObject({ unitPriceCp: 1250, totalCp: 1250 });
  });

  it('sells nothing, and says how many are left, when the shelf is short', async () => {
    const sale = await shop.call('POST', '/api/sales', { token: pip, body: { patronId: 1, tomeId: 7, quantity: 4 } });
    expect(sale.status).toBe(409);
    expect(sale.body).toEqual({ error: 'Only 3 left on the shelf' });

    expect(await stockOf(7)).toBe(3);
    expect(await ledgerOf(7)).toEqual([]);
    expect((await shop.call('GET', '/api/sales', { token: pip })).body).toEqual([]);
  });

  it('sells nothing for a tome that is not in the catalog', async () => {
    const sale = await shop.call('POST', '/api/sales', { token: pip, body: { patronId: 1, tomeId: 999, quantity: 1 } });
    expect(sale.status).toBe(404);
    expect(sale.body).toEqual({ error: 'Tome not found' });
  });

  it('never sells more copies than exist when two tills ring at once', async () => {
    const sales = await Promise.all(
      Array.from({ length: 5 }, () => shop.call('POST', '/api/sales', { token: pip, body: { patronId: 1, tomeId: 7, quantity: 1 } })),
    );
    expect(sales.filter((sale) => sale.status === 201)).toHaveLength(3);
    expect(sales.filter((sale) => sale.status === 409)).toHaveLength(2);
    expect(await stockOf(7)).toBe(0);
    expect((await shop.call('GET', '/api/sales', { token: pip })).body).toHaveLength(3);
  });
});

describe('a monster in the shop', () => {
  const bookwyrm = { monster: 'bookwyrm', severity: 'dire', description: 'Chewed through the bestiaries.', tomeId: 7, copiesDamaged: 2 };

  it('removes the damaged copies and alarms the public page until the owner resolves it', async () => {
    expect((await shop.call('GET', '/api/public/shop-status')).body).toMatchObject({ mood: 'calm', openIncidents: 0 });

    const report = await shop.call('POST', '/api/incidents', { token: pip, body: bookwyrm });
    expect(report.status).toBe(201);
    expect(report.body).toMatchObject({ tomeTitle: 'Dragons at Tea', copiesDamaged: 2, reportedBy: 'pip', status: 'open' });

    expect(await stockOf(7)).toBe(1);
    expect(await ledgerOf(7)).toMatchObject([{ delta: -2, reason: 'Damaged by bookwyrm', adjustedBy: 'pip' }]);
    expect((await shop.call('GET', '/api/public/shop-status')).body).toMatchObject({ mood: 'besieged', openIncidents: 1 });

    const resolved = await shop.call('POST', `/api/incidents/${report.body.id}/resolve`, { token: mirabel, body: { resolution: 'Lured out with a cookbook.' } });
    expect(resolved.body).toMatchObject({ status: 'resolved', resolvedBy: 'mirabel' });
    expect((await shop.call('GET', '/api/public/shop-status')).body).toMatchObject({ mood: 'calm', openIncidents: 0 });
  });

  it('logs nothing when more copies are claimed damaged than exist', async () => {
    const report = await shop.call('POST', '/api/incidents', { token: pip, body: { ...bookwyrm, copiesDamaged: 10 } });
    expect(report.status).toBe(409);
    expect(await stockOf(7)).toBe(3);
    expect((await shop.call('GET', '/api/incidents', { token: pip })).body).toEqual([]);
  });

  it('leaves fewer copies to sell afterwards', async () => {
    await shop.call('POST', '/api/incidents', { token: pip, body: bookwyrm });
    const sale = await shop.call('POST', '/api/sales', { token: pip, body: { patronId: 1, tomeId: 7, quantity: 2 } });
    expect(sale.status).toBe(409);
    expect(sale.body).toEqual({ error: 'Only 1 left on the shelf' });
  });
});

describe('who may do what, through the front door', () => {
  it('lets a visitor see the shop window and nothing behind the counter', async () => {
    const window = await shop.call('GET', '/api/public/tomes');
    expect(window.status).toBe(200);
    expect(window.body.map((tome: { title: string }) => tome.title)).toEqual(['Dragons at Tea']);
    expect((await shop.call('GET', '/api/public/patron-stats')).body).toEqual({ totalPatrons: 1, byRace: [{ race: 'dwarf', count: 1 }] });

    for (const path of ['/api/tomes', '/api/patrons', '/api/sales', '/api/incidents', '/api/wards', '/api/auth/me']) {
      expect((await shop.call('GET', path)).status, path).toBe(401);
    }
  });

  it('keeps the clerk out of the owner\'s business in every service', async () => {
    const attempts = [
      shop.call('POST', '/api/tomes', { token: pip, body: { title: 'Stonesong', author: 'Thrain', genre: 'poetry', priceCp: 800 } }),
      shop.call('PATCH', '/api/tomes/7', { token: pip, body: { priceCp: 1 } }),
      shop.call('PATCH', '/api/patrons/1', { token: pip, body: { tier: 'fellow' } }),
      shop.call('GET', '/api/sales/summary', { token: pip }),
      shop.call('POST', '/api/incidents/1/resolve', { token: pip, body: { resolution: 'Shooed it.' } }),
    ];
    for (const attempt of await Promise.all(attempts)) {
      expect(attempt.status).toBe(403);
      expect(attempt.body).toEqual({ error: 'Only the owner may do that' });
    }
    expect((await shop.call('GET', '/api/tomes/7', { token: pip })).body.priceCp).toBe(1000);
  });

  it('lets the owner do all of those things', async () => {
    const added = await shop.call('POST', '/api/tomes', { token: mirabel, body: { title: 'Stonesong', author: 'Thrain', genre: 'poetry', priceCp: 800, featured: true } });
    expect(added.status).toBe(201);
    expect((await shop.call('GET', '/api/public/tomes')).body.map((tome: { title: string }) => tome.title)).toContain('Stonesong');
    expect((await shop.call('PATCH', '/api/patrons/1', { token: mirabel, body: { tier: 'fellow' } })).body.tier).toBe('fellow');
  });

  it('tells a signed-in member of staff who they are', async () => {
    expect((await shop.call('GET', '/api/auth/me', { token: pip })).body).toMatchObject({ username: 'pip', role: 'clerk' });
  });

  it('turns away a token the gateway did not issue', async () => {
    const forged = pip.slice(0, -4) + 'AAAA';
    expect((await shop.call('GET', '/api/tomes', { token: forged })).status).toBe(401);
  });
});
