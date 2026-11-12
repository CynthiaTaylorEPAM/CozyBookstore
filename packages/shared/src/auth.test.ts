import Fastify from 'fastify';
import jwt from 'jsonwebtoken';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { requireStaff, signToken, verifyToken, type StaffIdentity } from './auth';
import { registerErrorHandler } from './errors';

const SECRET = 'secret';
const mirabel: StaffIdentity = { id: 1, username: 'mirabel', displayName: 'Mirabel Thistlewick', role: 'owner' };
const pip: StaffIdentity = { id: 2, username: 'pip', displayName: 'Pip Underbough', role: 'clerk' };
const bearer = (staff: StaffIdentity) => ({ authorization: `Bearer ${signToken(staff, SECRET)}` });

afterEach(() => {
  vi.useRealTimers();
});

describe('staff tokens', () => {
  it('round-trips a staff identity', () => {
    expect(verifyToken(signToken(mirabel, SECRET), SECRET)).toEqual(mirabel);
  });

  it('rejects a token signed with a different secret', () => {
    expect(() => verifyToken(signToken(mirabel, SECRET), 'other')).toThrow();
  });

  it('rejects a token whose role the shop does not know', () => {
    const forged = jwt.sign({ username: 'x', displayName: 'X', role: 'archmage' }, SECRET, { subject: '9' });
    expect(() => verifyToken(forged, SECRET)).toThrow('Unknown role');
  });

  it('stops accepting a token after twelve hours', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T08:00:00Z'));
    const token = signToken(pip, SECRET);
    vi.setSystemTime(new Date('2026-01-01T19:59:00Z'));
    expect(verifyToken(token, SECRET)).toEqual(pip);
    vi.setSystemTime(new Date('2026-01-01T20:01:00Z'));
    expect(() => verifyToken(token, SECRET)).toThrow();
  });
});

describe('requireStaff', () => {
  /** A tiny app with one route any staff may use and one for the owner alone. */
  function guardedApp() {
    const app = Fastify();
    registerErrorHandler(app);
    app.get('/staff', { preHandler: requireStaff(SECRET) }, async (request) => ({
      staff: request.staff,
      token: request.token,
    }));
    app.get('/owner', { preHandler: requireStaff(SECRET, 'owner') }, async () => ({ ok: true }));
    return app;
  }

  it('asks anyone without a token to sign in', async () => {
    const response = await guardedApp().inject({ method: 'GET', url: '/staff' });
    expect(response.statusCode).toBe(401);
    expect(response.json().error).toMatch(/please sign in/);
  });

  it.each([
    ['a token without the Bearer prefix', signToken(pip, SECRET)],
    ['a different scheme', 'Basic cGlwOnF1aWxs'],
    ['an empty Bearer token', 'Bearer '],
  ])('treats %s as not signed in', async (_label, authorization) => {
    const response = await guardedApp().inject({ method: 'GET', url: '/staff', headers: { authorization } });
    expect(response.statusCode).toBe(401);
  });

  it.each([
    ['gibberish', 'Bearer not-a-token'],
    ['a token signed by someone else', `Bearer ${signToken(pip, 'someone-else')}`],
    ['a token with an unknown role', `Bearer ${jwt.sign({ username: 'x', role: 'archmage' }, SECRET, { subject: '9' })}`],
  ])('turns away %s', async (_label, authorization) => {
    const response = await guardedApp().inject({ method: 'GET', url: '/staff', headers: { authorization } });
    expect(response.statusCode).toBe(401);
    expect(response.json().error).toMatch(/sign in again/);
  });

  it('turns away an expired token', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-01-01T08:00:00Z'));
    const headers = bearer(pip);
    vi.setSystemTime(new Date('2026-01-02T08:00:00Z'));
    const response = await guardedApp().inject({ method: 'GET', url: '/staff', headers });
    expect(response.statusCode).toBe(401);
  });

  it('lets any staff member through and remembers who they are', async () => {
    const headers = bearer(pip);
    const response = await guardedApp().inject({ method: 'GET', url: '/staff', headers });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ staff: pip, token: headers.authorization.slice('Bearer '.length) });
  });

  it('keeps a clerk out of an owner-only route, and says why', async () => {
    const response = await guardedApp().inject({ method: 'GET', url: '/owner', headers: bearer(pip) });
    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({ error: 'Only the owner may do that' });
  });

  it('lets the owner into an owner-only route', async () => {
    const response = await guardedApp().inject({ method: 'GET', url: '/owner', headers: bearer(mirabel) });
    expect(response.statusCode).toBe(200);
  });
});
