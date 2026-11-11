import type { FastifyRequest } from 'fastify';
import jwt from 'jsonwebtoken';
import { ROLES, type Role } from './domain';
import { HttpError } from './errors';

export interface StaffIdentity {
  id: number;
  username: string;
  displayName: string;
  role: Role;
}

declare module 'fastify' {
  interface FastifyRequest {
    /** Set by `requireStaff` once the caller's token has been verified. */
    staff?: StaffIdentity;
    /** The raw bearer token, kept so a service can forward it to another service. */
    token?: string;
  }
}

export function signToken(staff: StaffIdentity, secret: string): string {
  const { id, ...claims } = staff;
  return jwt.sign(claims, secret, { subject: String(id), expiresIn: '12h' });
}

export function verifyToken(token: string, secret: string): StaffIdentity {
  const claims = jwt.verify(token, secret) as jwt.JwtPayload;
  if (!ROLES.includes(claims.role)) throw new Error('Unknown role');
  return {
    id: Number(claims.sub),
    username: claims.username,
    displayName: claims.displayName,
    role: claims.role,
  };
}

/**
 * Route guard. `requireStaff(secret)` lets any signed-in staff member through;
 * `requireStaff(secret, 'owner')` restricts the route to the listed roles.
 */
export function requireStaff(secret: string, ...roles: Role[]) {
  return async (request: FastifyRequest): Promise<void> => {
    const header = request.headers.authorization ?? '';
    const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : '';
    if (!token) throw new HttpError(401, 'Staff only beyond this point — please sign in');
    let staff: StaffIdentity;
    try {
      staff = verifyToken(token, secret);
    } catch {
      throw new HttpError(401, 'Your session has expired — please sign in again');
    }
    if (roles.length && !roles.includes(staff.role)) {
      throw new HttpError(403, `Only the ${roles.join(' or ')} may do that`);
    }
    request.staff = staff;
    request.token = token;
  };
}
