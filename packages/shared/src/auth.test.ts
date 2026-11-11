import { describe, expect, it } from 'vitest';
import { signToken, verifyToken, type StaffIdentity } from './auth';

const mirabel: StaffIdentity = { id: 1, username: 'mirabel', displayName: 'Mirabel Thistlewick', role: 'owner' };

describe('staff tokens', () => {
  it('round-trips a staff identity', () => {
    expect(verifyToken(signToken(mirabel, 'secret'), 'secret')).toEqual(mirabel);
  });

  it('rejects a token signed with a different secret', () => {
    expect(() => verifyToken(signToken(mirabel, 'secret'), 'other')).toThrow();
  });
});
