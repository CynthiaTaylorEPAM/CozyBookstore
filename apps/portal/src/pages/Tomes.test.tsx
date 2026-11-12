import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { breakfast, dragons, shopAnswers } from '../test/fixtures';
import { MIRABEL, openPortal, PIP, pretendApi, refuse } from '../test/harness';

const row = async (title: string) => within(await screen.findByRole('row', { name: new RegExp(title) }));

describe('the shelves', () => {
  it('lists each tome with its price in coins, its stock and its badges', async () => {
    openPortal('/shop/tomes', PIP, pretendApi(shopAnswers()));

    const dragonsRow = await row('Dragons at Tea');
    expect(dragonsRow.getByText('Orsolya Brightscale')).toBeVisible();
    expect(dragonsRow.getByText('10 gp')).toBeVisible();
    expect(dragonsRow.getByText('shop window')).toBeVisible();

    expect((await row('Forbidden Names')).getByText('locked cabinet')).toBeVisible();

    const soldOut = await row('Second Breakfast');
    expect(soldOut.getByText('Sold out')).toBeVisible();
    expect(soldOut.getByRole('button', { name: 'Sell' })).toBeDisabled();
    expect(soldOut.getByRole('button', { name: 'Restock' })).toBeEnabled();
  });

  it('asks the catalog again as the search and the genre change', async () => {
    const gateway = pretendApi(shopAnswers());
    const { user } = openPortal('/shop/tomes', PIP, gateway);
    await row('Dragons at Tea');

    await user.type(screen.getByPlaceholderText(/Search by title or author/), 'tea');
    await waitFor(() => expect(gateway.calls.at(-1)?.path).toBe('/tomes?q=tea'));

    await user.selectOptions(screen.getByLabelText('Genre'), 'bestiary');
    await waitFor(() => expect(gateway.calls.at(-1)?.path).toBe('/tomes?q=tea&genre=bestiary'));
  });

  it('says so when nothing matches', async () => {
    openPortal('/shop/tomes', PIP, pretendApi({ ...shopAnswers(), 'GET /tomes': [] }));
    expect(await screen.findByText(/No tomes match/)).toBeVisible();
  });

  it("shows the catalog's own words when it cannot be reached", async () => {
    openPortal('/shop/tomes', PIP, pretendApi({ ...shopAnswers(), 'GET /tomes': refuse(503, 'The catalog is not answering') }));
    expect(await screen.findByText('The catalog is not answering')).toBeVisible();
  });
});

describe('what each role sees on the shelves', () => {
  it('gives the clerk selling and restocking, but no adding or editing', async () => {
    openPortal('/shop/tomes', PIP, pretendApi(shopAnswers()));
    const dragonsRow = await row('Dragons at Tea');
    expect(dragonsRow.getByRole('button', { name: 'Sell' })).toBeVisible();
    expect(dragonsRow.getByRole('button', { name: 'Restock' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Add a tome/ })).not.toBeInTheDocument();
  });

  it('gives the owner adding and editing as well', async () => {
    openPortal('/shop/tomes', MIRABEL, pretendApi(shopAnswers()));
    const dragonsRow = await row('Dragons at Tea');
    expect(dragonsRow.getByRole('button', { name: 'Edit' })).toBeVisible();
    expect(screen.getByRole('button', { name: /Add a tome/ })).toBeVisible();
  });
});

describe('selling a tome', () => {
  async function openSellDialog(gateway = pretendApi(shopAnswers())) {
    const portal = openPortal('/shop/tomes', PIP, gateway);
    await portal.user.click((await row('Dragons at Tea')).getByRole('button', { name: 'Sell' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Sell “Dragons at Tea”' }));
    await dialog.findByRole('option', { name: 'Thrain Emberforge (dwarf)' });
    return { ...portal, gateway, dialog };
  }

  it('will not ring up until a patron is chosen', async () => {
    const { dialog, user } = await openSellDialog();
    expect(dialog.getByRole('button', { name: 'Ring it up' })).toBeDisabled();
    await user.selectOptions(dialog.getByLabelText('Patron'), 'Thrain Emberforge (dwarf)');
    expect(dialog.getByRole('button', { name: 'Ring it up' })).toBeEnabled();
  });

  it('shows the running total and how many are on the shelf', async () => {
    const { dialog } = await openSellDialog();
    expect(dialog.getByLabelText('Copies (3 on the shelf)')).toHaveValue(1);
    expect(dialog.getByText('10 gp')).toBeVisible();
    fireEvent.change(dialog.getByLabelText(/Copies/), { target: { value: '3' } });
    expect(dialog.getByText('30 gp')).toBeVisible();
  });

  it('sends the sale, closes the dialog and refreshes the shelves', async () => {
    const { dialog, user, gateway } = await openSellDialog();
    gateway.answers['POST /sales'] = (body: unknown) => {
      gateway.answers['GET /tomes'] = [{ ...dragons, stock: 1 }, breakfast];
      return { id: 9, ...(body as object) };
    };
    await user.selectOptions(dialog.getByLabelText('Patron'), 'Thrain Emberforge (dwarf)');
    fireEvent.change(dialog.getByLabelText(/Copies/), { target: { value: '2' } });
    await user.click(dialog.getByRole('button', { name: 'Ring it up' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(gateway.sent('POST', '/sales')[0]).toMatchObject({ body: { patronId: 1, tomeId: 7, quantity: 2 }, token: 'token-for-pip' });
    const dragonsRow = await row('Dragons at Tea');
    await waitFor(() => expect(dragonsRow.getByRole('cell', { name: '1' })).toBeVisible());
  });

  it("keeps the dialog open and shows the catalog's refusal when the shelf is short", async () => {
    const { dialog, user, gateway } = await openSellDialog();
    gateway.answers['POST /sales'] = refuse(409, 'Only 1 left on the shelf');
    await user.selectOptions(dialog.getByLabelText('Patron'), 'Thrain Emberforge (dwarf)');
    await user.click(dialog.getByRole('button', { name: 'Ring it up' }));

    expect(await dialog.findByText('Only 1 left on the shelf')).toBeVisible();
    expect(screen.getByRole('dialog')).toBeVisible();
  });

  it('closes without selling', async () => {
    const { dialog, user, gateway } = await openSellDialog();
    await user.click(dialog.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(gateway.sent('POST', '/sales')).toEqual([]);
  });
});

describe('restocking a tome', () => {
  it('sends the copies arriving with a note for the ledger', async () => {
    const gateway = pretendApi({ ...shopAnswers(), 'POST /tomes/8/stock-adjustments': { ...breakfast, stock: 5 } });
    const { user } = openPortal('/shop/tomes', PIP, gateway);
    await user.click((await row('Second Breakfast')).getByRole('button', { name: 'Restock' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Restock “Second Breakfast”' }));
    fireEvent.change(dialog.getByLabelText('Copies arriving'), { target: { value: '5' } });
    await user.click(dialog.getByRole('button', { name: 'Shelve them' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(gateway.sent('POST', '/tomes/8/stock-adjustments')[0].body).toEqual({ delta: 5, reason: "Delivery from the scribes' guild" });
  });
});

describe('the owner managing the catalog', () => {
  it('adds a tome, turning the price typed in gold into copper', async () => {
    const gateway = pretendApi({ ...shopAnswers(), 'POST /tomes': (body: unknown) => ({ id: 20, ...(body as object) }) });
    const { user } = openPortal('/shop/tomes', MIRABEL, gateway);
    await user.click(await screen.findByRole('button', { name: /Add a tome/ }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Add a tome' }));

    await user.type(dialog.getByLabelText('Title'), 'Stonesong');
    await user.type(dialog.getByLabelText('Author'), 'Thrain Emberforge');
    await user.selectOptions(dialog.getByLabelText('Genre'), 'poetry');
    await user.selectOptions(dialog.getByLabelText('Condition'), 'well-loved');
    fireEvent.change(dialog.getByLabelText('Price (gold pieces)'), { target: { value: '14.5' } });
    fireEvent.change(dialog.getByLabelText('Copies'), { target: { value: '4' } });
    await user.type(dialog.getByLabelText('Description'), 'Best read aloud.');
    await user.click(dialog.getByLabelText(/Display in the shop window/));
    await user.click(dialog.getByRole('button', { name: 'Add to the catalog' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(gateway.sent('POST', '/tomes')[0].body).toEqual({
      title: 'Stonesong',
      author: 'Thrain Emberforge',
      genre: 'poetry',
      condition: 'well-loved',
      description: 'Best read aloud.',
      priceCp: 1450,
      stock: 4,
      featured: true,
      restricted: false,
    });
  });

  it('edits a tome starting from its current details, and never sends stock', async () => {
    const gateway = pretendApi({ ...shopAnswers(), 'PATCH /tomes/7': (body: unknown) => ({ ...dragons, ...(body as object) }) });
    const { user } = openPortal('/shop/tomes', MIRABEL, gateway);
    await user.click((await row('Dragons at Tea')).getByRole('button', { name: 'Edit' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Edit tome' }));

    expect(dialog.getByLabelText('Title')).toHaveValue('Dragons at Tea');
    expect(dialog.getByLabelText('Price (gold pieces)')).toHaveValue(10);
    expect(dialog.getByLabelText(/Display in the shop window/)).toBeChecked();
    expect(dialog.queryByLabelText('Copies')).not.toBeInTheDocument();

    fireEvent.change(dialog.getByLabelText('Price (gold pieces)'), { target: { value: '12.25' } });
    await user.click(dialog.getByLabelText(/Keep in the locked cabinet/));
    await user.click(dialog.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    const sent = gateway.sent('PATCH', '/tomes/7')[0].body;
    expect(sent).toMatchObject({ title: 'Dragons at Tea', priceCp: 1225, restricted: true, featured: true, description: dragons.description });
    expect(sent).not.toHaveProperty('stock');
    expect(sent).not.toHaveProperty('priceGold');
  });

  it("shows the catalog's refusal in the dialog", async () => {
    const gateway = pretendApi({ ...shopAnswers(), 'PATCH /tomes/7': refuse(400, 'Invalid request') });
    const { user } = openPortal('/shop/tomes', MIRABEL, gateway);
    await user.click((await row('Dragons at Tea')).getByRole('button', { name: 'Edit' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Edit tome' }));
    await user.click(dialog.getByRole('button', { name: 'Save changes' }));
    expect(await dialog.findByText('Invalid request')).toBeVisible();
  });
});
