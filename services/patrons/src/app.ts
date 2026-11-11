import Fastify, { type FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import { z } from 'zod';
import { type CatalogClient, notFound, RACES, registerErrorHandler, requireStaff, TIERS } from '@griffin/shared';

export interface PatronsDeps {
  db: Pool;
  jwtSecret: string;
  catalog: CatalogClient;
  logger?: boolean;
}

const PATRON_COLUMNS = `id, name, race, tier, home, notes, joined_at AS "joinedAt"`;
const SALE_COLUMNS = `s.id, s.patron_id AS "patronId", p.name AS "patronName", s.tome_id AS "tomeId",
  s.tome_title AS "tomeTitle", s.quantity, s.unit_price_cp AS "unitPriceCp", s.total_cp AS "totalCp",
  s.sold_by AS "soldBy", s.sold_at AS "soldAt"`;

const idParam = z.object({ id: z.coerce.number().int().positive() });

const newPatron = z.object({
  name: z.string().trim().min(1).max(120),
  race: z.enum(RACES),
  home: z.string().trim().max(120).default(''),
  notes: z.string().trim().max(1000).default(''),
});

const patronChanges = z.object({
  tier: z.enum(TIERS).optional(),
  home: z.string().trim().max(120).optional(),
  notes: z.string().trim().max(1000).optional(),
});

const newSale = z.object({
  patronId: z.number().int().positive(),
  tomeId: z.number().int().positive(),
  quantity: z.number().int().min(1).max(99),
});

export function buildApp({ db, jwtSecret, catalog, logger = false }: PatronsDeps): FastifyInstance {
  const app = Fastify({ logger });
  registerErrorHandler(app);

  const staff = requireStaff(jwtSecret);
  const ownerOnly = requireStaff(jwtSecret, 'owner');

  app.get('/health', async () => ({ status: 'ok', service: 'patrons' }));

  // --- Public: headline numbers for the landing page. No names are exposed.
  app.get('/public/patron-stats', async () => {
    const { rows } = await db.query(
      'SELECT race, count(*)::int AS count FROM patrons GROUP BY race ORDER BY count DESC, race',
    );
    return { totalPatrons: rows.reduce((sum, r) => sum + r.count, 0), byRace: rows };
  });

  // --- Patrons
  app.get('/patrons', { preHandler: staff }, async () => {
    const { rows } = await db.query(
      `SELECT ${PATRON_COLUMNS},
              (SELECT COALESCE(sum(total_cp), 0)::int FROM sales WHERE patron_id = patrons.id) AS "totalSpentCp"
         FROM patrons ORDER BY name`,
    );
    return rows;
  });

  app.get('/patrons/:id', { preHandler: staff }, async (request) => {
    const { id } = idParam.parse(request.params);
    const patron = await db.query(`SELECT ${PATRON_COLUMNS} FROM patrons WHERE id = $1`, [id]);
    if (!patron.rows[0]) throw notFound('Patron');
    const sales = await db.query(
      `SELECT ${SALE_COLUMNS} FROM sales s JOIN patrons p ON p.id = s.patron_id
        WHERE s.patron_id = $1 ORDER BY s.sold_at DESC`,
      [id],
    );
    return { ...patron.rows[0], sales: sales.rows };
  });

  app.post('/patrons', { preHandler: staff }, async (request, reply) => {
    const patron = newPatron.parse(request.body);
    const { rows } = await db.query(
      `INSERT INTO patrons (name, race, home, notes) VALUES ($1, $2, $3, $4) RETURNING ${PATRON_COLUMNS}`,
      [patron.name, patron.race, patron.home, patron.notes],
    );
    return reply.status(201).send(rows[0]);
  });

  // Only the owner decides who is promoted to a higher membership tier.
  app.patch('/patrons/:id', { preHandler: ownerOnly }, async (request) => {
    const { id } = idParam.parse(request.params);
    const changes = patronChanges.parse(request.body);
    const { rows } = await db.query(
      `UPDATE patrons SET tier = COALESCE($2, tier), home = COALESCE($3, home), notes = COALESCE($4, notes)
        WHERE id = $1 RETURNING ${PATRON_COLUMNS}`,
      [id, changes.tier ?? null, changes.home ?? null, changes.notes ?? null],
    );
    if (!rows[0]) throw notFound('Patron');
    return rows[0];
  });

  // --- Sales
  app.get('/sales', { preHandler: staff }, async () => {
    const { rows } = await db.query(
      `SELECT ${SALE_COLUMNS} FROM sales s JOIN patrons p ON p.id = s.patron_id
        ORDER BY s.sold_at DESC LIMIT 50`,
    );
    return rows;
  });

  // Ringing up a sale spans two services: the catalog takes the copies off
  // the shelf (and refuses if there are not enough), then we record the sale.
  app.post('/sales', { preHandler: staff }, async (request, reply) => {
    const sale = newSale.parse(request.body);
    const patron = await db.query('SELECT name FROM patrons WHERE id = $1', [sale.patronId]);
    if (!patron.rows[0]) throw notFound('Patron');

    const tome = await catalog.getTome(sale.tomeId, request.token!);
    await catalog.adjustStock(sale.tomeId, -sale.quantity, `Sold to ${patron.rows[0].name}`, request.token!);

    const { rows } = await db.query(
      `INSERT INTO sales (patron_id, tome_id, tome_title, quantity, unit_price_cp, total_cp, sold_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, patron_id AS "patronId", tome_id AS "tomeId", tome_title AS "tomeTitle", quantity,
                 unit_price_cp AS "unitPriceCp", total_cp AS "totalCp", sold_by AS "soldBy", sold_at AS "soldAt"`,
      [sale.patronId, tome.id, tome.title, sale.quantity, tome.priceCp, tome.priceCp * sale.quantity, request.staff!.username],
    );
    return reply.status(201).send({ ...rows[0], patronName: patron.rows[0].name });
  });

  // The takings are the owner's business alone.
  app.get('/sales/summary', { preHandler: ownerOnly }, async () => {
    const totals = await db.query(
      `SELECT COALESCE(sum(total_cp), 0)::int AS "allTimeCp",
              COALESCE(sum(total_cp) FILTER (WHERE sold_at > now() - interval '7 days'), 0)::int AS "last7DaysCp",
              count(*)::int AS "salesCount"
         FROM sales`,
    );
    const bestSellers = await db.query(
      `SELECT tome_title AS "tomeTitle", sum(quantity)::int AS copies, sum(total_cp)::int AS "totalCp"
         FROM sales GROUP BY tome_title ORDER BY copies DESC, "totalCp" DESC LIMIT 5`,
    );
    return { ...totals.rows[0], bestSellers: bestSellers.rows };
  });

  return app;
}
