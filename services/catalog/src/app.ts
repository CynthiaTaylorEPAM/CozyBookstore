import Fastify, { type FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import { z } from 'zod';
import { CONDITIONS, GENRES, HttpError, notFound, registerErrorHandler, requireStaff } from '@griffin/shared';

export interface CatalogDeps {
  db: Pool;
  jwtSecret: string;
  logger?: boolean;
}

// Database columns are snake_case; the API speaks camelCase.
const TOME_COLUMNS = `id, title, author, genre, description, price_cp AS "priceCp", stock,
  condition, restricted, featured, created_at AS "createdAt"`;

const idParam = z.object({ id: z.coerce.number().int().positive() });

const tomeFields = z.object({
  title: z.string().trim().min(1).max(200),
  author: z.string().trim().min(1).max(200),
  genre: z.enum(GENRES),
  description: z.string().trim().max(2000),
  priceCp: z.number().int().min(0),
  stock: z.number().int().min(0),
  condition: z.enum(CONDITIONS),
  restricted: z.boolean(),
  featured: z.boolean(),
});

// A new tome gets sensible values for anything left out.
const newTome = tomeFields.extend({
  description: tomeFields.shape.description.default(''),
  stock: tomeFields.shape.stock.default(0),
  condition: tomeFields.shape.condition.default('pristine'),
  restricted: tomeFields.shape.restricted.default(false),
  featured: tomeFields.shape.featured.default(false),
});

// A change touches only the fields that were sent, so it must not fill in
// defaults. Stock is left out: it moves only through stock adjustments.
const tomeChanges = tomeFields.omit({ stock: true }).partial();

const stockAdjustment = z.object({
  delta: z.number().int().refine((n) => n !== 0, 'delta must not be zero'),
  reason: z.string().trim().min(1).max(200),
});

const listQuery = z.object({
  q: z.string().trim().optional(),
  genre: z.enum(GENRES).optional(),
});

export function buildApp({ db, jwtSecret, logger = false }: CatalogDeps): FastifyInstance {
  const app = Fastify({ logger });
  registerErrorHandler(app);

  const staff = requireStaff(jwtSecret);
  const ownerOnly = requireStaff(jwtSecret, 'owner');

  app.get('/health', async () => ({ status: 'ok', service: 'catalog' }));

  // --- Public: the shop window, shown on the landing page without signing in.
  app.get('/public/tomes', async () => {
    const { rows } = await db.query(
      `SELECT ${TOME_COLUMNS} FROM tomes WHERE featured AND NOT restricted ORDER BY title`,
    );
    return rows;
  });

  // --- Staff: browse and search the shelves.
  app.get('/tomes', { preHandler: staff }, async (request) => {
    const { q, genre } = listQuery.parse(request.query);
    const { rows } = await db.query(
      `SELECT ${TOME_COLUMNS} FROM tomes
        WHERE ($1::text IS NULL OR title ILIKE '%' || $1 || '%' OR author ILIKE '%' || $1 || '%')
          AND ($2::text IS NULL OR genre = $2)
        ORDER BY title`,
      // A patron may search for "100%", so % and _ are matched as typed, not as wildcards.
      [q ? q.replace(/[\\%_]/g, '\\$&') : null, genre ?? null],
    );
    return rows;
  });

  app.get('/tomes/:id', { preHandler: staff }, async (request) => {
    const { id } = idParam.parse(request.params);
    const { rows } = await db.query(`SELECT ${TOME_COLUMNS} FROM tomes WHERE id = $1`, [id]);
    if (!rows[0]) throw notFound('Tome');
    return rows[0];
  });

  // --- Owner: add a tome to the catalog, or change its details.
  app.post('/tomes', { preHandler: ownerOnly }, async (request, reply) => {
    const tome = newTome.parse(request.body);
    const { rows } = await db.query(
      `INSERT INTO tomes (title, author, genre, description, price_cp, stock, condition, restricted, featured)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING ${TOME_COLUMNS}`,
      [
        tome.title,
        tome.author,
        tome.genre,
        tome.description,
        tome.priceCp,
        tome.stock,
        tome.condition,
        tome.restricted,
        tome.featured,
      ],
    );
    return reply.status(201).send(rows[0]);
  });

  app.patch('/tomes/:id', { preHandler: ownerOnly }, async (request) => {
    const { id } = idParam.parse(request.params);
    const changes = tomeChanges.parse(request.body);
    const { rows } = await db.query(
      `UPDATE tomes SET
         title = COALESCE($2, title),
         author = COALESCE($3, author),
         genre = COALESCE($4, genre),
         description = COALESCE($5, description),
         price_cp = COALESCE($6, price_cp),
         condition = COALESCE($7, condition),
         restricted = COALESCE($8, restricted),
         featured = COALESCE($9, featured)
       WHERE id = $1 RETURNING ${TOME_COLUMNS}`,
      [
        id,
        changes.title ?? null,
        changes.author ?? null,
        changes.genre ?? null,
        changes.description ?? null,
        changes.priceCp ?? null,
        changes.condition ?? null,
        changes.restricted ?? null,
        changes.featured ?? null,
      ],
    );
    if (!rows[0]) throw notFound('Tome');
    return rows[0];
  });

  // --- Staff (and other services): move stock up or down, with a reason.
  // Sales and monster damage arrive here as negative deltas; deliveries as positive.
  app.post('/tomes/:id/stock-adjustments', { preHandler: staff }, async (request) => {
    const { id } = idParam.parse(request.params);
    const { delta, reason } = stockAdjustment.parse(request.body);
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      // The WHERE clause makes "check there is enough, then take it" a single atomic step.
      const { rows } = await client.query(
        `UPDATE tomes SET stock = stock + $2 WHERE id = $1 AND stock + $2 >= 0 RETURNING ${TOME_COLUMNS}`,
        [id, delta],
      );
      if (!rows[0]) {
        const exists = await client.query('SELECT stock FROM tomes WHERE id = $1', [id]);
        await client.query('ROLLBACK');
        if (!exists.rows[0]) throw notFound('Tome');
        throw new HttpError(409, `Only ${exists.rows[0].stock} left on the shelf`);
      }
      await client.query(
        'INSERT INTO stock_adjustments (tome_id, delta, reason, adjusted_by) VALUES ($1, $2, $3, $4)',
        [id, delta, reason, request.staff!.username],
      );
      await client.query('COMMIT');
      return rows[0];
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  });

  app.get('/tomes/:id/stock-adjustments', { preHandler: staff }, async (request) => {
    const { id } = idParam.parse(request.params);
    const { rows } = await db.query(
      `SELECT id, delta, reason, adjusted_by AS "adjustedBy", adjusted_at AS "adjustedAt"
         FROM stock_adjustments WHERE tome_id = $1 ORDER BY adjusted_at DESC, id DESC`,
      [id],
    );
    return rows;
  });

  return app;
}
