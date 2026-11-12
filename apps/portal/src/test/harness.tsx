import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { vi } from 'vitest';
import { App } from '../App';
import { tokenStore } from '../api';
import { AuthProvider } from '../auth';
import type { Staff } from '../types';

export const MIRABEL: Staff = { id: 1, username: 'mirabel', displayName: 'Mirabel Thistlewick', role: 'owner' };
export const PIP: Staff = { id: 2, username: 'pip', displayName: 'Pip Underbough', role: 'clerk' };

/** An answer the pretend API refuses with, for example `refuse(409, 'Only 1 left on the shelf')`. */
export class Refusal {
  constructor(
    public readonly status: number,
    public readonly error: string,
  ) {}
}
export const refuse = (status: number, error: string) => new Refusal(status, error);

export interface ApiCall {
  method: string;
  /** The path after /api, including any query string. */
  path: string;
  body: unknown;
  token: string | null;
}

/**
 * Replaces the gateway with a table of canned answers, keyed by "METHOD /path".
 * An answer is the JSON to send back, a `refuse(...)`, or a function that is
 * given the request body and returns either of those.
 * A key without a query string also answers the same path with one.
 * Returns the calls the portal made, and the table itself so a test can change
 * an answer part-way through (for example, the stock after a sale).
 */
export function pretendApi(answers: Record<string, unknown>) {
  const calls: ApiCall[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input), 'http://shop.test');
      const method = init?.method ?? 'GET';
      const path = url.pathname.replace(/^\/api/, '') + url.search;
      const body = init?.body ? JSON.parse(String(init.body)) : undefined;
      const authorization = (init?.headers as Record<string, string> | undefined)?.authorization;
      calls.push({ method, path, body, token: authorization?.replace('Bearer ', '') ?? null });

      const key = [`${method} ${path}`, `${method} ${url.pathname.replace(/^\/api/, '')}`].find((k) => k in answers);
      if (!key) return json(404, { error: `The test has no answer for ${method} ${path}` });
      const answer = typeof answers[key] === 'function' ? (answers[key] as (body: unknown) => unknown)(body) : answers[key];
      if (answer instanceof Refusal) return json(answer.status, { error: answer.error });
      return json(200, answer);
    }),
  );
  return { calls, answers, sent: (method: string, path: string) => calls.filter((c) => c.method === method && c.path === path) };
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

let currentPath = '';
function WhereAmI() {
  currentPath = useLocation().pathname;
  return null;
}
/** The portal page the test has ended up on, for example "/shop/tomes". */
export const whereAmI = () => currentPath;

/**
 * Opens the whole portal at a page, signed in as the owner or the clerk, or
 * as a visitor. `api` is the table from `pretendApi`; the "who am I" answer
 * is added to it here.
 */
export function openPortal(path: string, as: Staff | null, api: ReturnType<typeof pretendApi>) {
  if (as) {
    tokenStore.set(`token-for-${as.username}`);
    api.answers['GET /auth/me'] ??= as;
  }
  const view = render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <WhereAmI />
        <App />
      </AuthProvider>
    </MemoryRouter>,
  );
  return { ...view, user: userEvent.setup() };
}
