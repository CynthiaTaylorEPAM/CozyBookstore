import { existsSync } from 'node:fs';
import httpProxy from '@fastify/http-proxy';
import fastifyStatic from '@fastify/static';
import Fastify, { type FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import { z } from 'zod';
import { HttpError, registerErrorHandler, requireStaff, signToken, type StaffIdentity } from '@griffin/shared';
import { verifyPassword } from './passwords';

export interface GatewayDeps {
  db: Pool;
  jwtSecret: string;
  /** Where each backing service lives, e.g. http://catalog:4001 */
  services: { catalog: string; patrons: string; incidents: string };
  /** Folder holding the built portal. Left out in development, where Vite serves it. */
  portalDir?: string;
  logger?: boolean;
}

/**
 * The gateway's routing table: which service answers which public path.
 * The portal only ever talks to the gateway.
 */
export function routingTable(services: GatewayDeps['services']) {
  return [
    { prefix: '/api/public/tomes', upstream: services.catalog, rewritePrefix: '/public/tomes' },
    { prefix: '/api/public/patron-stats', upstream: services.patrons, rewritePrefix: '/public/patron-stats' },
    { prefix: '/api/public/shop-status', upstream: services.incidents, rewritePrefix: '/public/shop-status' },
    { prefix: '/api/tomes', upstream: services.catalog, rewritePrefix: '/tomes' },
    { prefix: '/api/patrons', upstream: services.patrons, rewritePrefix: '/patrons' },
    { prefix: '/api/sales', upstream: services.patrons, rewritePrefix: '/sales' },
    { prefix: '/api/incidents', upstream: services.incidents, rewritePrefix: '/incidents' },
    { prefix: '/api/wards', upstream: services.incidents, rewritePrefix: '/wards' },
  ];
}

const credentials = z.object({ username: z.string().trim().min(1), password: z.string().min(1) });

export function buildApp({ db, jwtSecret, services, portalDir, logger = false }: GatewayDeps): FastifyInstance {
  const app = Fastify({ logger });
  registerErrorHandler(app);

  app.get('/health', async () => ({ status: 'ok', service: 'gateway' }));

  // --- Signing in
  app.post('/api/auth/login', async (request) => {
    const { username, password } = credentials.parse(request.body);
    const { rows } = await db.query(
      'SELECT id, username, display_name AS "displayName", role, password_hash FROM staff WHERE username = $1',
      [username.toLowerCase()],
    );
    const row = rows[0];
    if (!row || !verifyPassword(password, row.password_hash)) {
      throw new HttpError(401, 'The door stays shut — wrong name or password');
    }
    const staff: StaffIdentity = { id: row.id, username: row.username, displayName: row.displayName, role: row.role };
    return { token: signToken(staff, jwtSecret), staff };
  });

  app.get('/api/auth/me', { preHandler: requireStaff(jwtSecret) }, async (request) => request.staff);

  // --- Everything else under /api is passed on to the service that owns it.
  // Each service checks the staff token itself, so the gateway just forwards it.
  for (const route of routingTable(services)) {
    app.register(httpProxy, route);
  }

  // --- The portal (production only): static files, with index.html for client-side routes.
  if (portalDir && existsSync(portalDir)) {
    app.register(fastifyStatic, { root: portalDir });
    app.setNotFoundHandler((request, reply) => {
      if (request.method === 'GET' && !request.url.startsWith('/api/')) return reply.sendFile('index.html');
      return reply.status(404).send({ error: 'No such door in this shop' });
    });
  }

  return app;
}
