import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { besieged, dragons, sale, shopAnswers } from '../test/fixtures';
import { MIRABEL, openPortal, PIP, pretendApi } from '../test/harness';

/** The figure shown under a label in the row of numbers at the top. */
const stat = async (label: string) => (await screen.findByText(label)).nextElementSibling;
const panel = async (heading: string) => within((await screen.findByRole('heading', { name: heading })).closest('section')!);

describe('the counter', () => {
  it('greets the member of staff by first name and gives the mood of the shop', async () => {
    openPortal('/shop', PIP, pretendApi(shopAnswers()));
    expect(await screen.findByRole('heading', { name: 'Good day, Pip' })).toBeVisible();
    expect(await screen.findByText('All is calm')).toBeVisible();
  });

  it('warns when the shop is beset', async () => {
    openPortal('/shop', PIP, pretendApi({ ...shopAnswers(), 'GET /public/shop-status': besieged }));
    expect(await screen.findByText('Beset by monsters')).toBeVisible();
  });

  it('adds up the copies on the shelves and counts open incidents', async () => {
    openPortal('/shop', PIP, pretendApi(shopAnswers()));
    await waitFor(async () => expect(await stat('Tomes on the shelves')).toHaveTextContent('5'));
    expect(await stat('Open incidents')).toHaveTextContent('1');
    expect((await panel('Creatures at large')).getByText('Chewing through the bestiaries.')).toBeVisible();
  });

  it('lists tomes with two copies or fewer as running low', async () => {
    openPortal('/shop', PIP, pretendApi(shopAnswers()));
    const low = await panel('Running low');
    expect(await low.findByText('Second Breakfast')).toBeVisible();
    expect(low.getByText('None left')).toBeVisible();
    expect(low.getByText('Forbidden Names')).toBeVisible();
    expect(low.getByText('2 left')).toBeVisible();
    // Three copies is comfortable.
    expect(low.queryByText('Dragons at Tea')).not.toBeInTheDocument();
  });

  it('says so when every shelf is full and nothing is at large', async () => {
    openPortal('/shop', PIP, pretendApi({ ...shopAnswers(), 'GET /tomes': [dragons], 'GET /incidents?status=open': [] }));
    expect(await screen.findByText('Every shelf is comfortably full.')).toBeVisible();
    expect(await screen.findByText(/Not a claw, tentacle or footnote/)).toBeVisible();
  });

  it('shows at most the six latest sales', async () => {
    const eight = Array.from({ length: 8 }, (_, i) => ({ ...sale, id: i + 1, tomeTitle: `Sale ${i + 1}` }));
    openPortal('/shop', PIP, pretendApi({ ...shopAnswers(), 'GET /sales': eight }));
    const latest = await panel('Latest sales');
    expect(await latest.findByText('Sale 6')).toBeVisible();
    expect(latest.getAllByRole('row')).toHaveLength(6);
    expect(latest.queryByText('Sale 7')).not.toBeInTheDocument();
  });
});

describe('the takings', () => {
  it('are shown to the owner, with the best sellers', async () => {
    openPortal('/shop', MIRABEL, pretendApi(shopAnswers()));
    await waitFor(async () => expect(await stat('Takings, last 7 days')).toHaveTextContent('20 gp'));
    expect(await stat('Takings, all time')).toHaveTextContent('1234 gp 5 sp 6 cp');
    const best = await panel('Best sellers');
    expect(best.getByText('12 sold')).toBeVisible();
    expect(best.getByText('120 gp')).toBeVisible();
  });

  it('are neither shown to the clerk nor even asked for', async () => {
    const gateway = pretendApi(shopAnswers());
    openPortal('/shop', PIP, gateway);
    expect(await screen.findByText(/The strongbox is the owner's business/)).toBeVisible();
    await screen.findByText('All is calm');

    expect(screen.queryByText('Takings, all time')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Best sellers' })).not.toBeInTheDocument();
    expect(gateway.sent('GET', '/sales/summary')).toEqual([]);
  });
});
