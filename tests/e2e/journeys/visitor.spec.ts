import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { backstage, unique } from './shop';

test.describe('A visitor at the shop front', () => {
  test('sees the shop window, the guest book count and tonight\'s mood without signing in', async ({ page, request }) => {
    const mirabel = await backstage(request, 'mirabel');
    const onShow = await mirabel.addTome({ title: unique('Window Tome'), featured: true, priceCp: 1450 });
    const lockedAway = await mirabel.addTome({ title: unique('Cabinet Tome'), featured: true, restricted: true });

    await page.goto('/');
    await expect(page.getByRole('heading', { name: /Stories for every folk/ })).toBeVisible();

    const item = page.getByRole('article').filter({ hasText: onShow.title });
    await expect(item).toContainText('14 gp 5 sp');
    await expect(item).toContainText('3 on the shelf');
    await expect(page.getByText(lockedAway.title)).toHaveCount(0);

    // The hero's button takes the visitor down to the shop window.
    await page.getByRole('link', { name: 'Peek in the shop window' }).click();
    await expect(page.locator('section#window')).toBeInViewport();

    // The shop's own buying information stays behind the counter.
    const shopWindow = await request.get('/api/public/tomes');
    for (const tome of await shopWindow.json()) {
      expect(tome).not.toHaveProperty('reorderLevel');
      expect(tome).not.toHaveProperty('runningLow');
    }

    await expect(page.getByRole('heading', { name: /\d+ patrons of \d+ folk, one guest book/ })).toBeVisible();
    await expect(page.getByText(/Tonight: .+\./)).toBeVisible();
    await expect(page.getByText(/\d+ of \d+ wards holding/)).toBeVisible();
  });

  test('is shown the staff door when trying to go behind the counter', async ({ page }) => {
    for (const path of ['/shop', '/shop/tomes', '/shop/patrons', '/shop/incidents']) {
      await page.goto(path);
      await expect(page.getByRole('heading', { name: 'The staff door' })).toBeVisible();
      await expect(page).toHaveURL(/\/login$/);
    }
  });

  test('gets nothing from behind the counter by asking the API directly', async ({ request }) => {
    for (const path of ['/api/tomes', '/api/patrons', '/api/sales', '/api/sales/summary', '/api/incidents', '/api/wards']) {
      expect((await request.get(path)).status(), path).toBe(401);
    }
  });

  test('can reload or bookmark any page of the portal', async ({ page }) => {
    await page.goto('/login');
    await page.reload();
    await expect(page.getByRole('heading', { name: 'The staff door' })).toBeVisible();
  });
});

test.describe('Accessibility', () => {
  // An automated scan finds the mechanical problems (missing labels, broken
  // roles). It does not replace trying the pages with a keyboard and a screen reader.
  for (const [name, path] of [['shop front', '/'], ['login page', '/login']] as const) {
    test(`the ${name} has no critical accessibility problems`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
      const critical = results.violations.filter((violation) => violation.impact === 'critical');
      expect(critical.map((violation) => `${violation.id}: ${violation.help}`)).toEqual([]);
    });
  }
});
