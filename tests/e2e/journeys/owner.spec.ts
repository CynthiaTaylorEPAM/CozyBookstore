import { expect, test } from '@playwright/test';
import { backstage, findTome, signIn, unique } from './shop';

test.describe('Mirabel, the owner', () => {
  test('adds a tome to the catalog and puts it in the shop window', async ({ page }) => {
    const title = unique('Stonesong');
    await signIn(page, 'mirabel');
    await page.getByRole('link', { name: /Tomes/ }).click();
    await page.getByRole('button', { name: /Add a tome/ }).click();

    const dialog = page.getByRole('dialog', { name: 'Add a tome' });
    await dialog.getByLabel('Title').fill(title);
    await dialog.getByLabel('Author').fill('Thrain Emberforge');
    await dialog.getByLabel('Genre').selectOption('poetry');
    await dialog.getByLabel('Price (gold pieces)').fill('14.5');
    await dialog.getByLabel('Copies').fill('4');
    await dialog.getByLabel('Description').fill('Best read aloud and slightly too loudly.');
    await dialog.getByLabel(/Display in the shop window/).check();
    await dialog.getByRole('button', { name: 'Add to the catalog' }).click();
    await expect(dialog).toBeHidden();

    const row = await findTome(page, title);
    await expect(row).toContainText('14 gp 5 sp');
    await expect(row).toContainText('shop window');
    await expect(row.getByRole('cell', { name: '4', exact: true })).toBeVisible();

    await page.goto('/');
    const item = page.getByRole('article').filter({ hasText: title });
    await expect(item).toContainText('Best read aloud and slightly too loudly.');
    await expect(item).toContainText('4 on the shelf');
  });

  test('reprices a tome and locks it in the cabinet, which takes it out of the window', async ({ page, request }) => {
    const mirabel = await backstage(request, 'mirabel');
    const tome = await mirabel.addTome({ title: unique('Risky Tome'), featured: true, priceCp: 1000 });

    await signIn(page, 'mirabel');
    const row = await findTome(page, tome.title);
    await row.getByRole('button', { name: 'Edit' }).click();
    const dialog = page.getByRole('dialog', { name: 'Edit tome' });
    await expect(dialog.getByLabel('Price (gold pieces)')).toHaveValue('10');
    await dialog.getByLabel('Price (gold pieces)').fill('12.25');
    await dialog.getByLabel(/Keep in the locked cabinet/).check();
    await dialog.getByRole('button', { name: 'Save changes' }).click();

    await expect(row).toContainText('12 gp 2 sp 5 cp');
    await expect(row).toContainText('locked cabinet');
    await expect(row.getByRole('cell', { name: '3', exact: true })).toBeVisible();

    await page.goto('/');
    await expect(page.getByRole('heading', { name: /Stories for every folk/ })).toBeVisible();
    await expect(page.getByText(tome.title)).toHaveCount(0);
  });

  test('promotes a patron, and the promotion is still there after a reload', async ({ page, request }) => {
    const mirabel = await backstage(request, 'mirabel');
    const patron = await mirabel.addPatron(unique('Loyal'));

    await signIn(page, 'mirabel');
    await page.goto(`/shop/patrons/${patron.id}`);
    await expect(page.getByLabel('Membership tier')).toHaveValue('wanderer');
    await page.getByLabel('Membership tier').selectOption('fellow');
    await expect(page.getByLabel('Membership tier')).toHaveValue('fellow');

    await page.reload();
    await expect(page.getByLabel('Membership tier')).toHaveValue('fellow');
  });

  test('deals with an incident, and the public page counts one creature fewer', async ({ page, request }) => {
    const pip = await backstage(request, 'pip');
    const description = unique('Rattling in the stacks');
    await pip.post('/incidents', { monster: 'poltergeist', severity: 'dire', description });
    const before = (await pip.get('/public/shop-status')).body;
    expect(before.mood).toBe('besieged');

    await page.goto('/');
    await expect(page.getByText('Tonight: beset by monsters.')).toBeVisible();

    await signIn(page, 'mirabel');
    await page.getByRole('link', { name: /Incidents/ }).click();
    const card = page.getByRole('article').filter({ hasText: description });
    await card.getByRole('button', { name: 'Mark as dealt with' }).click();
    const dialog = page.getByRole('dialog', { name: 'Deal with the poltergeist' });
    await dialog.getByLabel('How was it dealt with?').fill('Asked it nicely to leave.');
    await dialog.getByRole('button', { name: 'Close the incident' }).click();

    await expect(card).toContainText('Asked it nicely to leave. — mirabel');
    await expect(card.getByRole('button', { name: 'Mark as dealt with' })).toHaveCount(0);

    const after = (await pip.get('/public/shop-status')).body;
    expect(after.openIncidents).toBe(before.openIncidents - 1);
  });

  test('sees the takings rise by exactly the value of a sale', async ({ page, request }) => {
    const mirabel = await backstage(request, 'mirabel');
    const before = (await mirabel.get('/sales/summary')).body;
    const tome = await mirabel.addTome({ title: unique('Takings Tome'), priceCp: 1234 });
    const patron = await mirabel.addPatron(unique('Spender'));
    await mirabel.post('/sales', { patronId: patron.id, tomeId: tome.id, quantity: 2 });

    const after = (await mirabel.get('/sales/summary')).body;
    expect(after.allTimeCp).toBe(before.allTimeCp + 2468);
    expect(after.salesCount).toBe(before.salesCount + 1);

    await signIn(page, 'mirabel');
    await expect(page.getByText('Takings, all time')).toBeVisible();
    await expect(page.getByText('Takings, last 7 days')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Best sellers' })).toBeVisible();
    const latestSales = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Latest sales' }) });
    const latest = latestSales.getByRole('row', { name: new RegExp(tome.title) });
    await expect(latest).toContainText(`2 × to ${patron.name}`);
    await expect(latest).toContainText('24 gp 6 sp 8 cp');
  });

  test('signs out, and the counter is locked again', async ({ page }) => {
    await signIn(page, 'mirabel');
    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect(page.getByRole('button', { name: 'Sign out' })).toHaveCount(0);

    await page.goto('/shop');
    await expect(page.getByRole('heading', { name: 'The staff door' })).toBeVisible();
  });
});
