import { expect, test } from '@playwright/test';
import { backstage, findTome, signIn, unique } from './shop';

test.describe('Pip, the clerk', () => {
  test('is refused with a wrong password, then let in with the right one', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Name').fill('pip');
    await page.getByLabel('Password').fill('not-the-password');
    await page.getByRole('button', { name: 'Come in' }).click();
    await expect(page.getByText('The door stays shut — wrong name or password')).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);

    await signIn(page, 'pip');
    await expect(page).toHaveURL(/\/shop$/);
    await expect(page.getByText('Pip Underbough')).toBeVisible();
  });

  test('stays signed in when the page is reloaded', async ({ page }) => {
    await signIn(page, 'pip');
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Good day, Pip' })).toBeVisible();
  });

  test('registers a new patron in the guest book', async ({ page }) => {
    const name = unique('Fizzwick');
    await signIn(page, 'pip');
    await page.getByRole('link', { name: /Patrons/ }).click();
    await page.getByRole('button', { name: /Register a patron/ }).click();

    const dialog = page.getByRole('dialog', { name: 'Register a patron' });
    await dialog.getByLabel('Name').fill(name);
    await dialog.getByLabel('Folk').selectOption('gnome');
    await dialog.getByLabel('Hails from').fill('Cogsworth');
    await dialog.getByRole('button', { name: 'Add to the guest book' }).click();

    const card = page.getByRole('link', { name: new RegExp(name) });
    await expect(card).toContainText('Cogsworth');
    await expect(card).toContainText('Wanderer');
    await expect(card).toContainText('0 cp spent');
  });

  test('rings up a sale: stock drops and the sale shows on the patron\'s page', async ({ page, request }) => {
    const mirabel = await backstage(request, 'mirabel');
    const tome = await mirabel.addTome({ title: unique('Sale Tome'), stock: 3, priceCp: 1250 });
    const patron = await mirabel.addPatron(unique('Buyer'));

    await signIn(page, 'pip');
    const row = await findTome(page, tome.title);
    await row.getByRole('button', { name: 'Sell' }).click();

    const dialog = page.getByRole('dialog', { name: new RegExp(tome.title) });
    await dialog.getByLabel('Patron').selectOption({ label: `${patron.name} (gnome)` });
    await dialog.getByLabel(/Copies/).fill('2');
    await expect(dialog.getByText('25 gp')).toBeVisible();
    await dialog.getByRole('button', { name: 'Ring it up' }).click();

    await expect(dialog).toBeHidden();
    await expect(row.getByRole('cell', { name: '1', exact: true })).toBeVisible();

    await page.goto(`/shop/patrons/${patron.id}`);
    const purchase = page.getByRole('row', { name: new RegExp(tome.title) });
    await expect(purchase).toContainText('× 2');
    await expect(purchase).toContainText('25 gp');
    await expect(purchase).toContainText('pip');

    // The catalog's ledger says why the copies left the shelf.
    const ledger = await mirabel.get(`/tomes/${tome.id}/stock-adjustments`);
    expect(ledger.body[0]).toMatchObject({ delta: -2, reason: `Sold to ${patron.name}`, adjustedBy: 'pip' });
  });

  test('is told how many are left when another till got there first', async ({ page, request }) => {
    const mirabel = await backstage(request, 'mirabel');
    const tome = await mirabel.addTome({ title: unique('Scarce Tome'), stock: 3 });
    const patron = await mirabel.addPatron(unique('Latecomer'));

    await signIn(page, 'pip');
    const row = await findTome(page, tome.title);
    await row.getByRole('button', { name: 'Sell' }).click();
    const dialog = page.getByRole('dialog', { name: new RegExp(tome.title) });
    await dialog.getByLabel('Patron').selectOption({ label: `${patron.name} (gnome)` });
    await dialog.getByLabel(/Copies/).fill('3');

    // While the dialog is open, two copies are sold elsewhere.
    await mirabel.post(`/tomes/${tome.id}/stock-adjustments`, { delta: -2, reason: 'Sold at the other till' });

    await dialog.getByRole('button', { name: 'Ring it up' }).click();
    await expect(dialog.getByText('Only 1 left on the shelf')).toBeVisible();
    expect((await mirabel.get(`/tomes/${tome.id}`)).body.stock).toBe(1);
  });

  test('cannot sell a tome that is sold out', async ({ page, request }) => {
    const mirabel = await backstage(request, 'mirabel');
    const tome = await mirabel.addTome({ title: unique('Gone Tome'), stock: 0 });
    await signIn(page, 'pip');
    const row = await findTome(page, tome.title);
    await expect(row).toContainText('Sold out');
    await expect(row.getByRole('button', { name: 'Sell' })).toBeDisabled();
  });

  test('takes a delivery onto the shelf', async ({ page, request }) => {
    const mirabel = await backstage(request, 'mirabel');
    const tome = await mirabel.addTome({ title: unique('Restock Tome'), stock: 0 });
    await signIn(page, 'pip');
    const row = await findTome(page, tome.title);
    await row.getByRole('button', { name: 'Restock' }).click();
    const dialog = page.getByRole('dialog', { name: new RegExp(tome.title) });
    await dialog.getByLabel('Copies arriving').fill('4');
    await dialog.getByRole('button', { name: 'Shelve them' }).click();
    await expect(row.getByRole('cell', { name: '4', exact: true })).toBeVisible();
    await expect(row.getByRole('button', { name: 'Sell' })).toBeEnabled();
  });

  test('reports a monster that ruined some copies, and cannot close the incident', async ({ page, request }) => {
    const mirabel = await backstage(request, 'mirabel');
    const tome = await mirabel.addTome({ title: unique('Chewed Tome'), stock: 3 });
    const description = unique('Crumbs everywhere');

    await signIn(page, 'pip');
    await page.getByRole('link', { name: /Incidents/ }).click();
    await page.getByRole('button', { name: /Report a monster/ }).click();

    const dialog = page.getByRole('dialog', { name: 'Report a monster' });
    await dialog.getByLabel('What is it?').selectOption('bookwyrm');
    await dialog.getByLabel('How bad?').selectOption('troublesome');
    await dialog.getByLabel('What happened?').fill(description);
    await dialog.getByLabel('Tome damaged (if any)').selectOption({ label: `${tome.title} (3)` });
    await dialog.getByLabel('Copies lost').fill('2');
    await expect(dialog.getByText('These copies will be taken out of stock in the catalog.')).toBeVisible();
    await dialog.getByRole('button', { name: 'Raise the alarm' }).click();

    const card = page.getByRole('article').filter({ hasText: description });
    await expect(card).toContainText(`2 copies of ${tome.title} lost`);
    await expect(card).toContainText('reported by pip');
    await expect(card).toContainText('Only the owner can close this.');
    await expect(card.getByRole('button', { name: 'Mark as dealt with' })).toHaveCount(0);

    expect((await mirabel.get(`/tomes/${tome.id}`)).body.stock).toBe(1);
  });

  test('sees no owner controls, and the API refuses them too', async ({ page, request }) => {
    const mirabel = await backstage(request, 'mirabel');
    const tome = await mirabel.addTome({ title: unique('Fixed Price Tome') });
    const patron = await mirabel.addPatron(unique('Hopeful'));

    await signIn(page, 'pip');
    await expect(page.getByText(/The strongbox is the owner's business/)).toBeVisible();
    await expect(page.getByText('Takings, all time')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Best sellers' })).toHaveCount(0);

    const row = await findTome(page, tome.title);
    await expect(row.getByRole('button', { name: 'Edit' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Add a tome/ })).toHaveCount(0);

    await page.goto(`/shop/patrons/${patron.id}`);
    await expect(page.getByRole('heading', { name: patron.name })).toBeVisible();
    await expect(page.getByLabel('Membership tier')).toHaveCount(0);

    // Hiding a button is a courtesy. The services are what actually say no.
    const pip = await backstage(request, 'pip');
    expect((await pip.patch(`/tomes/${tome.id}`, { priceCp: 1 })).status).toBe(403);
    expect((await pip.patch(`/patrons/${patron.id}`, { tier: 'fellow' })).status).toBe(403);
    expect((await pip.get('/sales/summary')).status).toBe(403);
  });
});
