import type { Pool } from 'pg';
import type { Role } from '@griffin/shared';
import { hashPassword } from './passwords';

export interface DemoStaff {
  username: string;
  displayName: string;
  role: Role;
  password: string;
}

/** The two people who work at the shop. Passwords can be overridden by environment variables. */
export function demoStaff(env: NodeJS.ProcessEnv = process.env): DemoStaff[] {
  return [
    { username: 'mirabel', displayName: 'Mirabel Thistlewick', role: 'owner', password: env.OWNER_PASSWORD || 'griffin' },
    { username: 'pip', displayName: 'Pip Underbough', role: 'clerk', password: env.CLERK_PASSWORD || 'quill' },
  ];
}

/** Creates the staff accounts the first time the gateway starts against an empty database. */
export async function seedStaff(db: Pool, staff: DemoStaff[]): Promise<void> {
  for (const member of staff) {
    await db.query(
      `INSERT INTO staff (username, display_name, role, password_hash) VALUES ($1, $2, $3, $4)
       ON CONFLICT (username) DO NOTHING`,
      [member.username, member.displayName, member.role, hashPassword(member.password)],
    );
  }
}
