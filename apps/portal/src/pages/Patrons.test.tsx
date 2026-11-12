import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ilyana, sale, shopAnswers, thrain } from '../test/fixtures';
import { MIRABEL, openPortal, PIP, pretendApi, refuse, whereAmI } from '../test/harness';

describe('the guest book', () => {
  it('shows each patron with their folk, home, tier and spending', async () => {
    openPortal('/shop/patrons', PIP, pretendApi(shopAnswers()));
    const card = within(await screen.findByRole('link', { name: /Thrain Emberforge/ }));
    expect(card.getByText(/dwarf · the Deep Halls/)).toBeVisible();
    expect(card.getByText('Regular')).toBeVisible();
    expect(card.getByText('20 gp spent')).toBeVisible();

    const newcomer = within(screen.getByRole('link', { name: /Ilyana Moonwhisper/ }));
    expect(newcomer.getByText('Wanderer')).toBeVisible();
    expect(newcomer.getByText('0 cp spent')).toBeVisible();
  });

  it("opens a patron's page from their card", async () => {
    const { user } = openPortal('/shop/patrons', PIP, pretendApi(shopAnswers()));
    await user.click(await screen.findByRole('link', { name: /Thrain Emberforge/ }));
    expect(await screen.findByRole('heading', { name: 'Thrain Emberforge' })).toBeVisible();
    expect(whereAmI()).toBe('/shop/patrons/1');
  });

  it('lets the clerk register a patron, then shows them in the book', async () => {
    const gateway = pretendApi(shopAnswers());
    gateway.answers['POST /patrons'] = (body: unknown) => {
      const pim = { ...ilyana, id: 3, ...(body as object), totalSpentCp: 0 };
      gateway.answers['GET /patrons'] = [ilyana, pim, thrain];
      return pim;
    };
    const { user } = openPortal('/shop/patrons', PIP, gateway);
    await user.click(await screen.findByRole('button', { name: /Register a patron/ }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Register a patron' }));
    await user.type(dialog.getByLabelText('Name'), 'Pim Butterburr');
    await user.selectOptions(dialog.getByLabelText('Folk'), 'halfling');
    await user.type(dialog.getByLabelText('Hails from'), 'Greenhollow');
    await user.click(dialog.getByRole('button', { name: 'Add to the guest book' }));

    expect(await screen.findByRole('link', { name: /Pim Butterburr/ })).toBeVisible();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(gateway.sent('POST', '/patrons')[0].body).toEqual({ name: 'Pim Butterburr', race: 'halfling', home: 'Greenhollow', notes: '' });
  });

  it("shows the service's refusal in the dialog", async () => {
    const gateway = pretendApi({ ...shopAnswers(), 'POST /patrons': refuse(400, 'Invalid request') });
    const { user } = openPortal('/shop/patrons', PIP, gateway);
    await user.click(await screen.findByRole('button', { name: /Register a patron/ }));
    const dialog = within(await screen.findByRole('dialog'));
    await user.type(dialog.getByLabelText('Name'), 'Zorp');
    await user.click(dialog.getByRole('button', { name: 'Add to the guest book' }));
    expect(await dialog.findByText('Invalid request')).toBeVisible();
  });
});

describe("a patron's page", () => {
  it('shows who they are, the notes, and what they have bought', async () => {
    openPortal('/shop/patrons/1', PIP, pretendApi(shopAnswers()));
    expect(await screen.findByRole('heading', { name: 'Thrain Emberforge' })).toBeVisible();
    expect(screen.getByText('dwarf of the Deep Halls')).toBeVisible();
    expect(screen.getByText('Owes us a ballad.')).toBeVisible();

    const purchase = within(screen.getByRole('row', { name: /Dragons at Tea/ }));
    expect(purchase.getByText('× 2')).toBeVisible();
    expect(purchase.getByText('20 gp')).toBeVisible();
    expect(purchase.getByText('pip')).toBeVisible();
  });

  it('says so when they have bought nothing yet', async () => {
    openPortal('/shop/patrons/2', PIP, pretendApi({ ...shopAnswers(), 'GET /patrons/2': { ...ilyana, sales: [] } }));
    expect(await screen.findByText('Nothing yet. Still browsing.')).toBeVisible();
    expect(screen.queryByText("Shopkeeper's notes")).not.toBeInTheDocument();
  });

  it('says so when there is no such patron', async () => {
    openPortal('/shop/patrons/99', PIP, pretendApi({ ...shopAnswers(), 'GET /patrons/99': refuse(404, 'Patron not found') }));
    expect(await screen.findByText('Patron not found')).toBeVisible();
  });

  it('shows the clerk the membership tier, with no way to change it', async () => {
    openPortal('/shop/patrons/1', PIP, pretendApi(shopAnswers()));
    await screen.findByRole('heading', { name: 'Thrain Emberforge' });
    expect(screen.getByText('Regular')).toBeVisible();
    expect(screen.queryByLabelText('Membership tier')).not.toBeInTheDocument();
  });

  it('lets the owner change the membership tier', async () => {
    const gateway = pretendApi(shopAnswers());
    gateway.answers['PATCH /patrons/1'] = (body: unknown) => {
      gateway.answers['GET /patrons/1'] = { ...thrain, ...(body as object), sales: [sale] };
      return { ...thrain, ...(body as object) };
    };
    const { user } = openPortal('/shop/patrons/1', MIRABEL, gateway);
    const tier = await screen.findByLabelText('Membership tier');
    expect(tier).toHaveValue('regular');
    await user.selectOptions(tier, 'Fellow of the Griffin');

    await waitFor(() => expect(screen.getByLabelText('Membership tier')).toHaveValue('fellow'));
    expect(gateway.sent('PATCH', '/patrons/1')[0].body).toEqual({ tier: 'fellow' });
  });

  it("shows the service's refusal if the tier cannot be changed", async () => {
    const gateway = pretendApi({ ...shopAnswers(), 'PATCH /patrons/1': refuse(403, 'Only the owner may do that') });
    const { user } = openPortal('/shop/patrons/1', MIRABEL, gateway);
    await user.selectOptions(await screen.findByLabelText('Membership tier'), 'fellow');
    expect(await screen.findByText('Only the owner may do that')).toBeVisible();
  });
});
