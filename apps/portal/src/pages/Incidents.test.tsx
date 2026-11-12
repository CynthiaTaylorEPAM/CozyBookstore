import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { openIncident, resolvedIncident, shopAnswers } from '../test/fixtures';
import { MIRABEL, openPortal, PIP, pretendApi, refuse } from '../test/harness';

describe('the incident board', () => {
  it('separates creatures at large from those dealt with', async () => {
    openPortal('/shop/incidents', PIP, pretendApi(shopAnswers()));
    expect(await screen.findByRole('heading', { name: 'At large (1)' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Dealt with (1)' })).toBeVisible();

    const [atLarge, dealtWith] = screen.getAllByRole('article').map((card) => within(card));
    expect(atLarge.getByText('bookwyrm')).toBeVisible();
    expect(atLarge.getByText('dire')).toBeVisible();
    expect(atLarge.getByText(/reported by pip/)).toBeVisible();
    expect(atLarge.getByText(/2 copies of/)).toHaveTextContent('2 copies of Dragons at Tea lost');

    expect(dealtWith.getByText('mimic')).toBeVisible();
    expect(dealtWith.getByText(/Sat on it firmly/)).toHaveTextContent('Sat on it firmly. — mirabel');
    expect(dealtWith.queryByText(/lost/)).not.toBeInTheDocument();
  });

  it('shows the wards and their state', async () => {
    openPortal('/shop/incidents', PIP, pretendApi(shopAnswers()));
    expect(await screen.findByText('The Threshold Rune')).toBeVisible();
    expect(screen.getByText('Front door · holding')).toBeVisible();
    expect(screen.getByText('Cellar hatch · flickering')).toBeVisible();
  });

  it('says so when nothing is lurking', async () => {
    openPortal('/shop/incidents', PIP, pretendApi({ ...shopAnswers(), 'GET /incidents': [resolvedIncident] }));
    expect(await screen.findByText(/Nothing lurking/)).toBeVisible();
    expect(screen.getByRole('heading', { name: 'At large (0)' })).toBeVisible();
  });

  it('writes "1 copy" in the singular', async () => {
    openPortal('/shop/incidents', PIP, pretendApi({ ...shopAnswers(), 'GET /incidents': [{ ...openIncident, copiesDamaged: 1 }] }));
    expect(await screen.findByText(/1 copy of/)).toBeVisible();
  });
});

describe('what each role may do about an incident', () => {
  it('tells the clerk that only the owner can close one', async () => {
    openPortal('/shop/incidents', PIP, pretendApi(shopAnswers()));
    expect(await screen.findByText('Only the owner can close this.')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Mark as dealt with' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Report a monster/ })).toBeVisible();
  });

  it('lets the owner close one, recording how', async () => {
    const gateway = pretendApi(shopAnswers());
    gateway.answers['POST /incidents/1/resolve'] = (body: { resolution: string }) => {
      const closed = { ...openIncident, status: 'resolved', resolvedBy: 'mirabel', resolution: body.resolution };
      gateway.answers['GET /incidents'] = [closed, resolvedIncident];
      return closed;
    };
    const { user } = openPortal('/shop/incidents', MIRABEL, gateway);
    await user.click(await screen.findByRole('button', { name: 'Mark as dealt with' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Deal with the bookwyrm' }));
    await user.type(dialog.getByLabelText('How was it dealt with?'), 'Lured out with a cookbook.');
    await user.click(dialog.getByRole('button', { name: 'Close the incident' }));

    expect(await screen.findByRole('heading', { name: 'Dealt with (2)' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'At large (0)' })).toBeVisible();
    expect(gateway.sent('POST', '/incidents/1/resolve')[0].body).toEqual({ resolution: 'Lured out with a cookbook.' });
  });

  it("shows the service's refusal when closing fails", async () => {
    const gateway = pretendApi({ ...shopAnswers(), 'POST /incidents/1/resolve': refuse(409, 'That incident has already been resolved') });
    const { user } = openPortal('/shop/incidents', MIRABEL, gateway);
    await user.click(await screen.findByRole('button', { name: 'Mark as dealt with' }));
    const dialog = within(await screen.findByRole('dialog'));
    await user.type(dialog.getByLabelText('How was it dealt with?'), 'Again.');
    await user.click(dialog.getByRole('button', { name: 'Close the incident' }));
    expect(await dialog.findByText('That incident has already been resolved')).toBeVisible();
  });
});

describe('reporting a monster', () => {
  async function openReportDialog(gateway = pretendApi({ ...shopAnswers(), 'POST /incidents': openIncident })) {
    const portal = openPortal('/shop/incidents', PIP, gateway);
    await portal.user.click(await screen.findByRole('button', { name: /Report a monster/ }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Report a monster' }));
    await dialog.findByRole('option', { name: 'Dragons at Tea (3)' });
    return { ...portal, gateway, dialog };
  }

  it('sends a plain sighting with no tome and no damage', async () => {
    const { dialog, user, gateway } = await openReportDialog();
    await user.selectOptions(dialog.getByLabelText('What is it?'), 'dust wraith');
    await user.selectOptions(dialog.getByLabelText('How bad?'), 'troublesome');
    await user.type(dialog.getByLabelText('What happened?'), 'Sneezing on the top shelf.');
    await user.click(dialog.getByRole('button', { name: 'Raise the alarm' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(gateway.sent('POST', '/incidents')[0].body).toEqual({
      monster: 'dust wraith',
      severity: 'troublesome',
      description: 'Sneezing on the top shelf.',
    });
  });

  it('describes the habits of the chosen monster', async () => {
    const { dialog, user } = await openReportDialog();
    expect(dialog.getByText(/Eats its way through a shelf/)).toBeVisible();
    await user.selectOptions(dialog.getByLabelText('What is it?'), 'mimic');
    expect(dialog.getByText(/Poses as a rare first edition/)).toBeVisible();
  });

  it('offers only tomes that are in stock as damaged', async () => {
    const { dialog } = await openReportDialog();
    expect(dialog.getByRole('option', { name: 'Forbidden Names (2)' })).toBeInTheDocument();
    expect(dialog.queryByRole('option', { name: /Second Breakfast/ })).not.toBeInTheDocument();
  });

  it('sends the damaged tome and the copies lost, and warns that stock will go down', async () => {
    const { dialog, user, gateway } = await openReportDialog();
    await user.type(dialog.getByLabelText('What happened?'), 'A feast.');
    expect(dialog.queryByLabelText('Copies lost')).not.toBeInTheDocument();

    await user.selectOptions(dialog.getByLabelText('Tome damaged (if any)'), 'Dragons at Tea (3)');
    expect(dialog.getByLabelText('Copies lost')).toHaveValue(1);
    expect(dialog.getByText('These copies will be taken out of stock in the catalog.')).toBeVisible();
    fireEvent.change(dialog.getByLabelText('Copies lost'), { target: { value: '2' } });
    await user.click(dialog.getByRole('button', { name: 'Raise the alarm' }));

    await waitFor(() => expect(gateway.sent('POST', '/incidents')).toHaveLength(1));
    expect(gateway.sent('POST', '/incidents')[0].body).toEqual({
      monster: 'bookwyrm',
      severity: 'minor',
      description: 'A feast.',
      tomeId: 7,
      copiesDamaged: 2,
    });
  });

  it("keeps the dialog open and shows the catalog's refusal", async () => {
    const { dialog, user } = await openReportDialog(pretendApi({ ...shopAnswers(), 'POST /incidents': refuse(409, 'Only 3 left on the shelf') }));
    await user.type(dialog.getByLabelText('What happened?'), 'A feast.');
    await user.click(dialog.getByRole('button', { name: 'Raise the alarm' }));
    expect(await dialog.findByText('Only 3 left on the shelf')).toBeVisible();
  });
});
