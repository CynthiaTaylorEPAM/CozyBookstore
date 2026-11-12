import { join } from 'node:path';
import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createPool, migrate, staffHeaders, TEST_DATABASE_URL, verifyToken } from '@griffin/shared';
import { buildApp, routingTable } from '../src/app';
import { hashPassword, verifyPassword } from '../src/passwords';
import { demoStaff, seedStaff } from '../src/staff';

let db: Pool;
let app: FastifyInstance;
const services = { catalog: 'http://catalog.test', patrons: 'http://patrons.test', incidents: 'http://incidents.test' };

beforeAll(async () => {
  db = createPool(TEST_DATABASE_URL, 'auth');
  await migrate(db, 'auth', join(__dirname, '..', 'migrations'));
  await db.query('TRUNCATE staff RESTART IDENTITY');
  await seedStaff(db, demoStaff({ OWNER_PASSWORD: 'griffin', CLERK_PASSWORD: 'quill' }));
  app = buildApp({ db, jwtSecret: 'test-secret', services });
});

afterAll(async () => {
  await app.close();
  await db.end();
});

describe('passwords', () => {
  it('verifies the right password and rejects the wrong one', () => {
    const stored = hashPassword('griffin');
    expect(stored).not.toContain('griffin');
    expect(verifyPassword('griffin', stored)).toBe(true);
    expect(verifyPassword('gryphon', stored)).toBe(false);
  });
});

describe('signing in', () => {
  it('gives the owner a token that identifies her as the owner', async () => {
    const login = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { username: 'Mirabel', password: 'griffin' } });
    expect(login.statusCode).toBe(200);
    expect(login.json().staff).toMatchObject({ username: 'mirabel', role: 'owner' });

    const me = await app.inject({ method: 'GET', url: '/api/auth/me', headers: { authorization: `Bearer ${login.json().token}` } });
    expect(me.json()).toMatchObject({ displayName: 'Mirabel Thistlewick', role: 'owner' });
  });

  it('signs the clerk in as a clerk', async () => {
    const login = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { username: 'pip', password: 'quill' } });
    expect(login.json().staff.role).toBe('clerk');
  });

  it('turns away a wrong password and an unknown name with the same message', async () => {
    const wrong = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { username: 'pip', password: 'nope' } });
    const unknown = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { username: 'nobody', password: 'nope' } });
    expect(wrong.statusCode).toBe(401);
    expect(unknown.statusCode).toBe(401);
    expect(wrong.json()).toEqual(unknown.json());
  });

  it('forgives stray spaces around the name', async () => {
    const login = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { username: '  pip ', password: 'quill' } });
    expect(login.statusCode).toBe(200);
  });

  it('does not forgive capitals in the password', async () => {
    const login = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { username: 'pip', password: 'Quill' } });
    expect(login.statusCode).toBe(401);
  });

  it.each([
    ['no password', { username: 'pip' }],
    ['no name', { password: 'quill' }],
    ['a blank name', { username: '   ', password: 'quill' }],
    ['an empty password', { username: 'pip', password: '' }],
    ['nothing at all', {}],
  ])('asks for both name and password when given %s', async (_label, payload) => {
    const login = await app.inject({ method: 'POST', url: '/api/auth/login', payload });
    expect(login.statusCode).toBe(400);
    expect(login.json().error).toBe('Invalid request');
  });

  it('never sends the stored password back', async () => {
    const login = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { username: 'pip', password: 'quill' } });
    expect(Object.keys(login.json()).sort()).toEqual(['staff', 'token']);
    expect(Object.keys(login.json().staff).sort()).toEqual(['displayName', 'id', 'role', 'username']);
  });

  it('issues a token the other services accept', async () => {
    const login = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { username: 'pip', password: 'quill' } });
    expect(verifyToken(login.json().token, 'test-secret')).toMatchObject({ username: 'pip', role: 'clerk' });
  });

  it('refuses /me with a token it did not issue', async () => {
    const me = await app.inject({ method: 'GET', url: '/api/auth/me', headers: staffHeaders('owner', 'someone-elses-secret') });
    expect(me.statusCode).toBe(401);
  });

  it('refuses /me without a token', async () => {
    const me = await app.inject({ method: 'GET', url: '/api/auth/me' });
    expect(me.statusCode).toBe(401);
  });
});

describe('routing table', () => {
  it('sends each resource to the service that owns it', () => {
    const owners = Object.fromEntries(routingTable(services).map((route) => [route.prefix, route.upstream]));
    expect(owners['/api/tomes']).toBe(services.catalog);
    expect(owners['/api/sales']).toBe(services.patrons);
    expect(owners['/api/patrons']).toBe(services.patrons);
    expect(owners['/api/incidents']).toBe(services.incidents);
  });
});
