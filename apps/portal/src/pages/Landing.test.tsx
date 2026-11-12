import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { besieged, breakfast, dragons, shopAnswers } from '../test/fixtures';
import { MIRABEL, openPortal, pretendApi, refuse } from '../test/harness';

describe('the shop front', () => {
  it('needs no sign-in and asks only for public information', async () => {
    const gateway = pretendApi(shopAnswers());
    openPortal('/', null, gateway);
    expect(await screen.findByRole('heading', { name: 'Dragons at Tea' })).toBeVisible();

    expect(gateway.calls.map((call) => call.path).sort()).toEqual(['/public/patron-stats', '/public/shop-status', '/public/tomes']);
    for (const call of gateway.calls) expect(call.token).toBeNull();
  });

  it('shows the shop window with prices in coins and what is on the shelf', async () => {
    openPortal('/', null, pretendApi({ ...shopAnswers(), 'GET /public/tomes': [dragons, breakfast] }));
    const item = within((await screen.findByRole('heading', { name: 'Dragons at Tea' })).closest('article')!);
    expect(item.getByText('by Orsolya Brightscale')).toBeVisible();
    expect(item.getByText(/10 gp/)).toBeVisible();
    expect(item.getByText('3 on the shelf')).toBeVisible();

    const soldOut = within(screen.getByRole('heading', { name: 'Second Breakfast' }).closest('article')!);
    expect(soldOut.getByText('Sold out')).toBeVisible();
  });

  it('counts the patrons by folk', async () => {
    openPortal('/', null, pretendApi(shopAnswers()));
    expect(await screen.findByRole('heading', { name: '2 patrons of 2 folk, one guest book' })).toBeVisible();
    const dwarves = within(screen.getByText('Dwarves').closest('.folk') as HTMLElement);
    expect(dwarves.getByText('1 in the guest book')).toBeVisible();
    const orcs = within(screen.getByText('Orcs').closest('.folk') as HTMLElement);
    expect(orcs.getByText('Not yet. Be the first.')).toBeVisible();
  });

  it('reports a calm night and how many wards are holding', async () => {
    openPortal('/', null, pretendApi(shopAnswers()));
    const pill = await screen.findByText('Tonight: all is calm.');
    expect(pill.closest('a')).toHaveTextContent('Tonight: all is calm. 1 of 2 wards holding.');
    expect(screen.getByText('The Cellar Seal')).toBeVisible();
  });

  it('warns visitors when monsters are about', async () => {
    openPortal('/', null, pretendApi({ ...shopAnswers(), 'GET /public/shop-status': besieged }));
    const pill = await screen.findByText('Tonight: beset by monsters.');
    expect(pill.closest('a')).toHaveTextContent('1 of 2 wards holding, 1 creature being dealt with.');
  });

  it('still reads well when the services behind it are not answering', async () => {
    openPortal('/', null, pretendApi({
      'GET /public/tomes': refuse(503, 'down'),
      'GET /public/patron-stats': refuse(503, 'down'),
      'GET /public/shop-status': refuse(503, 'down'),
    }));
    expect(await screen.findByText(/The window is fogged up just now/)).toBeVisible();
    expect(await screen.findByText(/The ward-keeper is not answering/)).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Patrons of every folk, one guest book' })).toBeVisible();
    expect(screen.queryByText(/Tonight:/)).not.toBeInTheDocument();
  });

  it('points a visitor to the staff door, and staff back to the counter', async () => {
    const visitor = openPortal('/', null, pretendApi(shopAnswers()));
    expect(screen.getByRole('link', { name: 'Staff door' })).toHaveAttribute('href', '/login');
    visitor.unmount();

    openPortal('/', MIRABEL, pretendApi(shopAnswers()));
    expect(await screen.findByRole('link', { name: 'Back to the counter' })).toHaveAttribute('href', '/shop');
  });
});
