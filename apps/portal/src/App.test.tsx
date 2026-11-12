import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { tokenStore } from './api';
import { shopAnswers } from './test/fixtures';
import { MIRABEL, openPortal, PIP, pretendApi, refuse, whereAmI } from './test/harness';

describe('the staff door', () => {
  it.each(['/shop', '/shop/tomes', '/shop/patrons', '/shop/patrons/1', '/shop/incidents'])(
    'sends a visitor who opens %s to the login page',
    async (path) => {
      const gateway = pretendApi(shopAnswers());
      openPortal(path, null, gateway);
      expect(await screen.findByRole('heading', { name: 'The staff door' })).toBeVisible();
      expect(whereAmI()).toBe('/login');
      // Nothing behind the counter was even asked for.
      expect(gateway.calls).toEqual([]);
    },
  );

  it('sends an unknown address to the shop front', async () => {
    openPortal('/dragons/lair', null, pretendApi(shopAnswers()));
    await waitFor(() => expect(whereAmI()).toBe('/'));
  });

  it('remembers who was signed in when the page is reloaded', async () => {
    const gateway = pretendApi(shopAnswers());
    openPortal('/shop/tomes', PIP, gateway);
    expect(await screen.findByRole('heading', { name: 'Tomes' })).toBeVisible();
    expect(screen.getByText('Pip Underbough')).toBeVisible();
    expect(screen.getByText('clerk')).toBeVisible();
    expect(gateway.sent('GET', '/auth/me')[0].token).toBe('token-for-pip');
  });

  it('asks for a fresh sign-in when the saved session is no longer good', async () => {
    vi.stubGlobal('location', { assign: vi.fn() });
    const gateway = pretendApi({ ...shopAnswers(), 'GET /auth/me': refuse(401, 'Your session has expired — please sign in again') });
    openPortal('/shop', PIP, gateway);
    expect(await screen.findByRole('heading', { name: 'The staff door' })).toBeVisible();
    expect(tokenStore.get()).toBeNull();
  });

  it('takes someone already signed in straight past the login page', async () => {
    openPortal('/login', MIRABEL, pretendApi(shopAnswers()));
    expect(await screen.findByRole('heading', { name: 'Good day, Mirabel' })).toBeVisible();
    expect(whereAmI()).toBe('/shop');
  });

  it('signs out: forgets the token and locks the counter again', async () => {
    const { user } = openPortal('/shop', MIRABEL, pretendApi(shopAnswers()));
    await user.click(await screen.findByRole('button', { name: 'Sign out' }));

    await waitFor(() => expect(whereAmI()).not.toMatch(/^\/shop/));
    expect(tokenStore.get()).toBeNull();
    expect(screen.queryByRole('button', { name: 'Sign out' })).not.toBeInTheDocument();
  });

  it('moves between the staff pages from the sidebar', async () => {
    const { user } = openPortal('/shop', PIP, pretendApi(shopAnswers()));
    await user.click(await screen.findByRole('link', { name: /Patrons/ }));
    expect(await screen.findByRole('heading', { name: 'Patrons' })).toBeVisible();
    await user.click(screen.getByRole('link', { name: /Incidents/ }));
    expect(await screen.findByRole('heading', { name: 'Incidents' })).toBeVisible();
  });
});
