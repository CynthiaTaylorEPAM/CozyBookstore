import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { tokenStore } from '../api';
import { shopAnswers } from '../test/fixtures';
import { MIRABEL, openPortal, PIP, pretendApi, refuse, whereAmI } from '../test/harness';

describe('signing in', () => {
  it('keeps the button shut until both name and password are typed', async () => {
    const { user } = openPortal('/login', null, pretendApi({}));
    const button = screen.getByRole('button', { name: 'Come in' });
    expect(button).toBeDisabled();
    await user.type(screen.getByLabelText('Name'), 'pip');
    expect(button).toBeDisabled();
    await user.type(screen.getByLabelText('Password'), 'quill');
    expect(button).toBeEnabled();
  });

  it('sends the name and password, keeps the token and opens the counter', async () => {
    const gateway = pretendApi({ ...shopAnswers(), 'POST /auth/login': { token: 'fresh-token', staff: PIP } });
    const { user } = openPortal('/login', null, gateway);
    await user.type(screen.getByLabelText('Name'), 'pip');
    await user.type(screen.getByLabelText('Password'), 'quill');
    await user.click(screen.getByRole('button', { name: 'Come in' }));

    expect(await screen.findByRole('heading', { name: 'Good day, Pip' })).toBeVisible();
    expect(whereAmI()).toBe('/shop');
    expect(gateway.sent('POST', '/auth/login')[0].body).toEqual({ username: 'pip', password: 'quill' });
    expect(tokenStore.get()).toBe('fresh-token');
    // From here on the token goes with every request.
    expect(gateway.sent('GET', '/tomes')[0].token).toBe('fresh-token');
  });

  it('shows the refusal for a wrong password and stays at the door', async () => {
    const gateway = pretendApi({ 'POST /auth/login': refuse(401, 'The door stays shut — wrong name or password') });
    const { user } = openPortal('/login', null, gateway);
    await user.type(screen.getByLabelText('Name'), 'pip');
    await user.type(screen.getByLabelText('Password'), 'nope');
    await user.click(screen.getByRole('button', { name: 'Come in' }));

    expect(await screen.findByText('The door stays shut — wrong name or password')).toBeVisible();
    expect(whereAmI()).toBe('/login');
    expect(tokenStore.get()).toBeNull();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Come in' })).toBeEnabled());
  });

  it('signs in with one click on a demo account', async () => {
    const gateway = pretendApi({ ...shopAnswers(), 'POST /auth/login': { token: 'owner-token', staff: MIRABEL } });
    const { user } = openPortal('/login', null, gateway);
    await user.click(screen.getByRole('button', { name: /Mirabel Thistlewick/ }));

    expect(await screen.findByRole('heading', { name: 'Good day, Mirabel' })).toBeVisible();
    expect(gateway.sent('POST', '/auth/login')[0].body).toEqual({ username: 'mirabel', password: 'griffin' });
  });

  it('offers a demo account for the owner and for the clerk', () => {
    openPortal('/login', null, pretendApi({}));
    expect(screen.getByRole('button', { name: /Mirabel Thistlewick.*Owner/ })).toBeVisible();
    expect(screen.getByRole('button', { name: /Pip Underbough.*Clerk/ })).toBeVisible();
  });
});
