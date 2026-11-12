import { describe, expect, it, vi } from 'vitest';
import { api, ApiError, tokenStore } from './api';
import { pretendApi, refuse } from './test/harness';

describe('calling the gateway', () => {
  it('asks under /api and returns what comes back', async () => {
    const gateway = pretendApi({ 'GET /public/tomes': [{ id: 1 }] });
    await expect(api('/public/tomes')).resolves.toEqual([{ id: 1 }]);
    expect(gateway.calls).toEqual([{ method: 'GET', path: '/public/tomes', body: undefined, token: null }]);
  });

  it('shows the staff token once someone is signed in', async () => {
    const gateway = pretendApi({ 'GET /tomes': [] });
    tokenStore.set('pips-token');
    await api('/tomes');
    expect(gateway.calls[0].token).toBe('pips-token');
  });

  it('sends a body as JSON with the chosen method', async () => {
    const gateway = pretendApi({ 'POST /sales': { id: 1 } });
    await api('/sales', { method: 'POST', body: { patronId: 1, tomeId: 7, quantity: 2 } });
    expect(gateway.calls[0]).toMatchObject({ method: 'POST', body: { patronId: 1, tomeId: 7, quantity: 2 } });
    const init = vi.mocked(fetch).mock.calls[0][1];
    expect(init?.headers).toMatchObject({ 'content-type': 'application/json' });
  });

  it("turns a refusal into an error carrying the service's own words", async () => {
    pretendApi({ 'POST /sales': refuse(409, 'Only 1 left on the shelf') });
    const error = await api('/sales', { method: 'POST', body: {} }).catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 409, message: 'Only 1 left on the shelf' });
  });

  it('falls back to a plain message when the refusal has no words', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('<html>Bad gateway</html>', { status: 502 })));
    await expect(api('/tomes')).rejects.toMatchObject({ status: 502, message: 'Something went awry' });
  });
});

describe('when a session has run out', () => {
  it('forgets the token and sends the staff member back to the door', async () => {
    const assign = vi.fn();
    vi.stubGlobal('location', { assign });
    pretendApi({ 'GET /tomes': refuse(401, 'Your session has expired — please sign in again') });
    tokenStore.set('stale-token');

    await expect(api('/tomes')).rejects.toMatchObject({ status: 401 });
    expect(tokenStore.get()).toBeNull();
    expect(assign).toHaveBeenCalledWith('/login');
  });

  it('does not bounce a visitor who was never signed in', async () => {
    const assign = vi.fn();
    vi.stubGlobal('location', { assign });
    pretendApi({ 'GET /tomes': refuse(401, 'Staff only beyond this point — please sign in') });

    await expect(api('/tomes')).rejects.toMatchObject({ status: 401 });
    expect(assign).not.toHaveBeenCalled();
  });

  it('does not bounce on a wrong password, so the login page can show the refusal', async () => {
    const assign = vi.fn();
    vi.stubGlobal('location', { assign });
    pretendApi({ 'POST /auth/login': refuse(401, 'The door stays shut — wrong name or password') });
    tokenStore.set('an-old-token');

    await expect(api('/auth/login', { method: 'POST', body: {} })).rejects.toMatchObject({ message: 'The door stays shut — wrong name or password' });
    expect(assign).not.toHaveBeenCalled();
    expect(tokenStore.get()).toBe('an-old-token');
  });

  it('leaves a signed-in member of staff alone when they are merely not allowed', async () => {
    const assign = vi.fn();
    vi.stubGlobal('location', { assign });
    pretendApi({ 'GET /sales/summary': refuse(403, 'Only the owner may do that') });
    tokenStore.set('pips-token');

    await expect(api('/sales/summary')).rejects.toMatchObject({ status: 403 });
    expect(tokenStore.get()).toBe('pips-token');
    expect(assign).not.toHaveBeenCalled();
  });
});
