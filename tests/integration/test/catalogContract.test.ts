import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { type CatalogClient, createHttpCatalogClient, fakeCatalog } from '@griffin/shared';
import { openShop, type Shop } from './shop';

/**
 * The patrons and incidents tests use a fake catalog. That is only safe while
 * the fake answers the way the real catalog service does, so the same checks
 * run here against both. If one of them changes, this file fails.
 */
let shop: Shop;
let token: string;

beforeAll(async () => {
  shop = await openShop();
});

beforeEach(async () => {
  await shop.reset();
  token = await shop.login('pip');
});

afterAll(async () => {
  await shop.close();
});

const catalogs: [string, () => CatalogClient][] = [
  ['the fake catalog used in service tests', () => fakeCatalog().client],
  ['the real catalog service', () => createHttpCatalogClient(shop.catalogUrl)],
];

describe.each(catalogs)('%s', (_name, make) => {
  let catalog: CatalogClient;
  beforeEach(() => {
    catalog = make();
  });

  it('describes a tome by id, title, price and stock', async () => {
    expect(await catalog.getTome(7, token)).toMatchObject({ id: 7, title: 'Dragons at Tea', priceCp: 1000, stock: 3 });
  });

  it('answers 404 for a tome it does not have', async () => {
    await expect(catalog.getTome(999, token)).rejects.toMatchObject({ statusCode: 404, message: 'Tome not found' });
    await expect(catalog.adjustStock(999, -1, 'Sold', token)).rejects.toMatchObject({ statusCode: 404, message: 'Tome not found' });
  });

  it('takes copies off the shelf and reports what is left', async () => {
    expect(await catalog.adjustStock(7, -2, 'Sold to Thrain', token)).toMatchObject({ id: 7, stock: 1 });
    expect(await catalog.getTome(7, token)).toMatchObject({ stock: 1 });
  });

  it('can take the last copy', async () => {
    expect(await catalog.adjustStock(7, -3, 'Sold', token)).toMatchObject({ stock: 0 });
  });

  it('refuses with 409 and the number left when asked for too many, and takes none', async () => {
    await expect(catalog.adjustStock(7, -4, 'Sold', token)).rejects.toMatchObject({
      statusCode: 409,
      message: 'Only 3 left on the shelf',
    });
    expect(await catalog.getTome(7, token)).toMatchObject({ stock: 3 });
  });
});
