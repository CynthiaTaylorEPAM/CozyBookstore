import Fastify, { type FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import { z } from 'zod';
import {
  type CatalogClient,
  HttpError,
  MONSTERS,
  notFound,
  registerErrorHandler,
  requireStaff,
  SEVERITIES,
} from '@griffin/shared';
import { shopMood } from './shopMood';

export interface IncidentsDeps {
  db: Pool;
  jwtSecret: string;
  catalog: CatalogClient;
  logger?: boolean;
}

const INCIDENT_COLUMNS = `id, monster, severity, description, tome_id AS "tomeId", tome_title AS "tomeTitle",
  copies_damaged AS "copiesDamaged", status, reported_by AS "reportedBy", reported_at AS "reportedAt",
  resolved_by AS "resolvedBy", resolved_at AS "resolvedAt", resolution`;

const idParam = z.object({ id: z.coerce.number().int().positive() });

const newIncident = z
  .object({
    monster: z.enum(MONSTERS),
    severity: z.enum(SEVERITIES),
    description: z.string().trim().min(1).max(1000),
    tomeId: z.number().int().positive().optional(),
    copiesDamaged: z.number().int().min(0).max(999).default(0),
  })
  .refine((incident) => incident.copiesDamaged === 0 || incident.tomeId !== undefined, {
    message: 'Say which tome was damaged',
    path: ['tomeId'],
  });

const resolution = z.object({ resolution: z.string().trim().min(1).max(1000) });

const listQuery = z.object({ status: z.enum(['open', 'resolved']).optional() });

export function buildApp({ db, jwtSecret, catalog, logger = false }: IncidentsDeps): FastifyInstance {
  const app = Fastify({ logger });
  registerErrorHandler(app);

  const staff = requireStaff(jwtSecret);
  const ownerOnly = requireStaff(jwtSecret, 'owner');

  app.get('/health', async () => ({ status: 'ok', service: 'incidents' }));

  // --- Public: "is it safe to visit?" for the landing page.
  app.get('/public/shop-status', async () => {
    const open = await db.query(`SELECT severity FROM incidents WHERE status = 'open'`);
    const wards = await db.query('SELECT name, location, status FROM wards ORDER BY id');
    return {
      mood: shopMood(open.rows.map((row) => row.severity)),
      openIncidents: open.rows.length,
      wards: wards.rows,
    };
  });

  app.get('/wards', { preHandler: staff }, async () => {
    const { rows } = await db.query('SELECT id, name, location, description, status FROM wards ORDER BY id');
    return rows;
  });

  app.get('/incidents', { preHandler: staff }, async (request) => {
    const { status } = listQuery.parse(request.query);
    const { rows } = await db.query(
      `SELECT ${INCIDENT_COLUMNS} FROM incidents
        WHERE ($1::text IS NULL OR status = $1)
        ORDER BY (status = 'open') DESC, reported_at DESC`,
      [status ?? null],
    );
    return rows;
  });

  // Any staff member can raise the alarm. If the monster ruined some copies,
  // the catalog service takes them off the shelf before we log the incident.
  app.post('/incidents', { preHandler: staff }, async (request, reply) => {
    const incident = newIncident.parse(request.body);
    let tomeTitle: string | null = null;
    if (incident.tomeId !== undefined) {
      const tome = await catalog.getTome(incident.tomeId, request.token!);
      tomeTitle = tome.title;
      if (incident.copiesDamaged > 0) {
        await catalog.adjustStock(
          incident.tomeId,
          -incident.copiesDamaged,
          `Damaged by ${incident.monster}`,
          request.token!,
        );
      }
    }
    const { rows } = await db.query(
      `INSERT INTO incidents (monster, severity, description, tome_id, tome_title, copies_damaged, reported_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING ${INCIDENT_COLUMNS}`,
      [
        incident.monster,
        incident.severity,
        incident.description,
        incident.tomeId ?? null,
        tomeTitle,
        incident.copiesDamaged,
        request.staff!.username,
      ],
    );
    return reply.status(201).send(rows[0]);
  });

  // Only the owner can declare a monster dealt with.
  app.post('/incidents/:id/resolve', { preHandler: ownerOnly }, async (request) => {
    const { id } = idParam.parse(request.params);
    const body = resolution.parse(request.body);
    const { rows } = await db.query(
      `UPDATE incidents SET status = 'resolved', resolution = $2, resolved_by = $3, resolved_at = now()
        WHERE id = $1 AND status = 'open' RETURNING ${INCIDENT_COLUMNS}`,
      [id, body.resolution, request.staff!.username],
    );
    if (!rows[0]) {
      const exists = await db.query('SELECT 1 FROM incidents WHERE id = $1', [id]);
      if (!exists.rows[0]) throw notFound('Incident');
      throw new HttpError(409, 'That incident has already been resolved');
    }
    return rows[0];
  });

  return app;
}
