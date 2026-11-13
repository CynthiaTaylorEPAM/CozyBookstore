# Code Quality Standards

**Project**: gilded-griffin
**Linter**: ESLint 10 with typescript-eslint 8 recommended (`eslint.config.mjs:4-16`)
**Formatter**: none. There is no Prettier or other formatter config; match the surrounding file's style (2-space indent, single quotes, semicolons, trailing commas in multi-line literals).
**Type checker**: TypeScript 6, `strict: true` (`tsconfig.base.json:7`)

The project rules come from `AGENTS.md:33-45`. Exact gate commands are in `.ai-run/guides/quality-gates.md`.

---

## Enforced Lint Rules (`eslint.config.mjs`)

| Rule | Setting | Why |
|---|---|---|
| `js.configs.recommended`, `tseslint.configs.recommended` | on | Baseline (`eslint.config.mjs:7-8`) |
| `@typescript-eslint/no-non-null-assertion` | off | Handlers use `request.staff!` and `request.token!` after the guard has run (`eslint.config.mjs:11-12`) |
| `@typescript-eslint/no-unused-vars` | error, `ignoreRestSiblings` | Allows `const { id, ...claims } = staff` (`eslint.config.mjs:13`, `packages/shared/src/auth.ts:23`) |
| Ignored paths | `dist`, `node_modules`, `trailer/` | The trailer is not part of the system (`eslint.config.mjs:5-6`) |

---

## Service Boundaries

A service reads and writes only its own Postgres schema. To use another service's data, call its API through a shared client, forwarding `request.token` (`AGENTS.md:35`).

| Avoid | Prefer |
|---|---|
| `SELECT ... FROM catalog.tomes` inside patrons or incidents | `catalog.getTome(id, request.token!)` (`services/patrons/src/app.ts:116`) |
| Calling the catalog with a service-level or no token | Forward the caller's token so the catalog knows who acted (`services/patrons/src/app.ts:117`, `packages/shared/src/auth.ts:57`) |
| A cross-schema foreign key | Store the id and copy title/price at the time (`services/patrons/src/app.ts:124`) |
| Building a client inside a route | Inject it through `buildApp` deps (`services/patrons/src/app.ts:6-11`, `services/patrons/src/index.ts:9-10`) |

---

## Schema Changes

Schema changes are new numbered files in that service's `migrations/`. Never edit a migration that has been merged (`AGENTS.md:36`). The runner applies files once each, in filename order, and records them in `schema_migrations` (`packages/shared/src/db.ts:18-47`).

| Avoid | Prefer |
|---|---|
| Adding a column to `001_create_tomes.sql` | A new `003_add_tome_reorder_level.sql` (`services/catalog/migrations/003_add_tome_reorder_level.sql:1-2`) |
| A new column with no default on a table with demo rows | `NOT NULL DEFAULT ...` plus a `CHECK` so existing rows stay valid (`services/catalog/migrations/003_add_tome_reorder_level.sql:2`) |
| Seed data in application code | Demo data as a migration (`services/catalog/migrations/002_seed_demo_tomes.sql`) |

---

## Money

Money is an integer number of copper pieces (`priceCp`, `totalCp`); 1 gp = 10 sp = 100 cp. Never use floats. Format with `formatMoney` (`AGENTS.md:37`).

| Avoid | Prefer |
|---|---|
| `price: 12.34` or `z.number()` for a price | `priceCp: z.number().int().min(0)` (`services/catalog/src/app.ts:29`) |
| Hand-building "12 gold" strings | `formatMoney(1234)` gives `"12 gp 3 sp 4 cp"` (`packages/shared/src/money.ts:33-41`) |
| Multiplying floats for totals | `tome.priceCp * sale.quantity` on integers (`services/patrons/src/app.ts:124`) |
| Typed gold in the portal stored as-is | Convert with `goldToCopper` (`apps/portal/src/money.ts:14`); the portal's `formatMoney` copy must match the shared one (`apps/portal/src/lore.test.ts:28`) |

---

## Auth and Public Routes

Every non-public route has `preHandler: requireStaff(jwtSecret)` or `requireStaff(jwtSecret, 'owner')`. Public routes live under `/public/` and expose no personal data (`AGENTS.md:38`).

| Avoid | Prefer |
|---|---|
| A staff route with no `preHandler` | `{ preHandler: staff }` built once per app (`services/catalog/src/app.ts:63-64`, `services/catalog/src/app.ts:77`) |
| Hiding an owner action only in the portal | `{ preHandler: ownerOnly }` on the route (`services/patrons/src/app.ts:130`) |
| A public endpoint returning names or staff-only fields | Counts only (`services/patrons/src/app.ts:49-54`); separate public column list (`services/catalog/src/app.ts:12-18`) |
| A public route outside `/public/` | `/public/tomes`, `/public/patron-stats`, `/public/shop-status` |

Guard messages: 401 when not signed in or expired, 403 for the wrong role (`packages/shared/src/auth.ts:46-55`).

---

## Validation

Parse every request body, query and params with a zod schema. Valid values for races, monsters, genres and so on come from `packages/shared/src/domain.ts` (`AGENTS.md:39`).

| Avoid | Prefer |
|---|---|
| Reading `request.body.title` directly | `newTome.parse(request.body)` (`services/catalog/src/app.ts:99`) |
| `Number(request.params.id)` | `idParam.parse(request.params)` with `z.coerce.number().int().positive()` (`services/catalog/src/app.ts:20`) |
| A hard-coded list `['elf', 'dwarf']` | `z.enum(RACES)` from the shared domain (`services/patrons/src/app.ts:22`, `packages/shared/src/domain.ts:8`) |
| `.partial()` on a schema with defaults for PATCH | A defaults-free field schema, with defaults only on the create schema, so a PATCH never resets fields it left out (`services/catalog/src/app.ts:22-47`) |
| Unbounded numbers | Explicit limits, e.g. quantity 1 to 99 (`services/patrons/src/app.ts:36`) |

A new race, monster or genre starts in `packages/shared/src/domain.ts:1-4`, then the portal's `lore.ts` (checked by `apps/portal/src/lore.test.ts`).

---

## Gateway Routing

New gateway-facing routes need an entry in `routingTable` in `services/gateway/src/app.ts` only if they introduce a new path prefix (`AGENTS.md:40`).

| Avoid | Prefer |
|---|---|
| A new `/bounties` resource with no gateway entry (portal gets 404) | Add `{ prefix: '/api/bounties', upstream: ..., rewritePrefix: '/bounties' }` beside the others (`services/gateway/src/app.ts:24-35`) and a case in `services/gateway/test/routing.test.ts` |
| Adding an entry for `/tomes/:id/history` | Nothing: `/api/tomes` already covers sub-paths |

---

## API Shape and Errors

JSON, camelCase. Errors are `{ "error": "message" }` with the right status code; throw `HttpError` (`AGENTS.md:41`).

| Avoid | Prefer |
|---|---|
| Returning snake_case columns | Alias in SQL: `price_cp AS "priceCp"` (`services/catalog/src/app.ts:12-15`) |
| `throw new Error('not found')` (becomes 500) | `throw notFound('Tome')` or `new HttpError(409, ...)` (`packages/shared/src/errors.ts:5-14`, `services/catalog/src/app.ts:168`) |
| `reply.send({ message })` for errors | Let the shared handler shape it (`packages/shared/src/errors.ts:17-31`) |
| A 200 for a created resource | `reply.status(201).send(...)` (`services/catalog/src/app.ts:116`) |

---

## Portal

Types in `apps/portal/src/types.ts` and display text in `apps/portal/src/lore.ts` are kept in step with the services by hand. Hide owner-only controls from clerks, but rely on the API to enforce it (`AGENTS.md:43`).

| Avoid | Prefer |
|---|---|
| Changing an API field without touching the portal | Update `types.ts` and the schema in `tests/integration/test/portalTypes.test.ts` together |
| Showing "Add a tome" to the clerk | `{isOwner && (...)}` (`apps/portal/src/pages/Tomes.tsx:36`) |
| Fetching owner-only data and hiding it | Do not request it for clerks (`apps/portal/src/pages/Dashboard.tsx:15`) |
| Treating the hidden button as the protection | The route's `ownerOnly` guard is the protection |

---

## Docs

Update `docs/api.md` when routes change (`AGENTS.md:44`). Note field-level changes too, as was done for `reorderLevel` and `runningLow` (`docs/api.md:29-34`). Docs are written for a non-technical reader.

---

## Tone and Naming

Light whimsy in user-facing text; plain, clear names in code (`AGENTS.md:45`).

| Avoid | Prefer |
|---|---|
| Whimsical identifiers (`summonScroll`, `goblinCount`) | Plain names: `adjustStock`, `totalSpentCp`, `requireStaff` |
| Dry user-facing errors ("Unauthorized") | `'Staff only beyond this point — please sign in'` (`packages/shared/src/auth.ts:46`), `'Only 3 left on the shelf'` (`services/catalog/src/app.ts:168`) |
| Jargon in portal text | Shop language: "Running low", "Reorder at" |

Comments explain why, briefly (`services/catalog/src/app.ts:84`, `services/catalog/src/app.ts:159`). Prefer plain, explicit code to clever abstractions (`docs/purpose.md:50`).
