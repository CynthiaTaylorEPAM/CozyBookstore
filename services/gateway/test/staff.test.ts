import { join } from 'node:path';
import type { Pool } from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createPool, migrate, ROLES, TEST_DATABASE_URL } from '@griffin/shared';
import { hashPassword, verifyPassword } from '../src/passwords';
import { demoStaff, seedStaff } from '../src/staff';

describe('passwords', () => {
  it('salts each password, so the same one is never stored the same way twice', () => {
    expect(hashPassword('griffin')).not.toBe(hashPassword('griffin'));
  });

  it('tells apart passwords that differ only by capitals or a trailing space', () => {
    const stored = hashPassword('griffin');
    expect(verifyPassword('Griffin', stored)).toBe(false);
    expect(verifyPassword('griffin ', stored)).toBe(false);
    expect(verifyPassword('', stored)).toBe(false);
  });

  it.each(['', 'no-separator', 'salt-only:', ':hash-only', 'salt:not-hex'])(
    'rejects every password when the stored value is damaged: "%s"',
    (stored) => {
      expect(verifyPassword('griffin', stored)).toBe(false);
      expect(verifyPassword('', stored)).toBe(false);
    },
  );
});

describe('the demo staff', () => {
  it('are one owner and one clerk, with the documented passwords by default', () => {
    expect(demoStaff({})).toEqual([
      { username: 'mirabel', displayName: 'Mirabel Thistlewick', role: 'owner', password: 'griffin' },
      { username: 'pip', displayName: 'Pip Underbough', role: 'clerk', password: 'quill' },
    ]);
  });

  it('take their passwords from the environment when given', () => {
    const [owner, clerk] = demoStaff({ OWNER_PASSWORD: 'a-better-one', CLERK_PASSWORD: 'another' });
    expect(owner.password).toBe('a-better-one');
    expect(clerk.password).toBe('another');
  });

  it('fall back to the default when a password is set but empty', () => {
    expect(demoStaff({ OWNER_PASSWORD: '' })[0].password).toBe('griffin');
  });

  it('only hold roles the shop knows', () => {
    for (const member of demoStaff({})) expect(ROLES).toContain(member.role);
  });
});

describe('creating the staff accounts', () => {
  let db: Pool;

  beforeAll(async () => {
    db = createPool(TEST_DATABASE_URL, 'auth');
    await migrate(db, 'auth', join(__dirname, '..', 'migrations'));
  });

  beforeEach(async () => {
    await db.query('TRUNCATE staff RESTART IDENTITY');
  });

  afterAll(async () => {
    await db.end();
  });

  it('never stores a password as plain text', async () => {
    await seedStaff(db, demoStaff({}));
    const { rows } = await db.query('SELECT password_hash FROM staff');
    expect(rows).toHaveLength(2);
    for (const row of rows) {
      expect(row.password_hash).not.toContain('griffin');
      expect(row.password_hash).not.toContain('quill');
    }
  });

  it('leaves existing accounts alone when the gateway restarts', async () => {
    await seedStaff(db, demoStaff({ OWNER_PASSWORD: 'first' }));
    await seedStaff(db, demoStaff({ OWNER_PASSWORD: 'second' }));
    const { rows } = await db.query(`SELECT password_hash FROM staff WHERE username = 'mirabel'`);
    expect(rows).toHaveLength(1);
    expect(verifyPassword('first', rows[0].password_hash)).toBe(true);
    expect(verifyPassword('second', rows[0].password_hash)).toBe(false);
  });
});
