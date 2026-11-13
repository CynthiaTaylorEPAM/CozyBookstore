# Architecture Guide

**Project**: gilded-griffin (The Gilded Griffin, fantasy bookstore management)
**Style**: Microservices behind a gateway, npm workspaces monorepo, one Postgres with a schema per service
**Language**: TypeScript 6 (strict, `tsconfig.base.json:7`) | **Framework**: Fastify 5 services, React 19 + Vite 8 portal

The human source of truth is `docs/architecture.md` (diagrams, data model, decisions). This guide condenses it for changes that cross services.

---

## Architecture Overview

```
browser ──> gateway :8080  (login, routing table, serves built portal)
              ├──> catalog   :4001  tomes, stock, stock ledger      ── schema catalog
              ├──> patrons   :4002  patrons, sales   ──> catalog    ── schema patrons
              └──> incidents :4003  monsters, wards  ──> catalog    ── schema incidents
            gateway itself                                          ── schema auth
            all four schemas live in one PostgreSQL 16 database
```

**Key decision**: small and representative for a non-technical leadership demo (database, separate services, gateway, portal, roles), while keeping each service's data separate so splitting later means moving a schema, not untangling tables (`docs/architecture.md:527`).

---

## Component Structure

| Piece | Folder | Port | Owns | Schema |
|---|---|---|---|---|
| Portal | `apps/portal` | 5173 (dev only) | Landing page and staff screens | none |
| Gateway | `services/gateway` | 8080 | Staff accounts, login, routing, serving the portal | `auth` |
| Catalog | `services/catalog` | 4001 | Tomes, stock levels, stock ledger | `catalog` |
| Patrons | `services/patrons` | 4002 | Patrons, sales | `patrons` |
| Incidents | `services/incidents` | 4003 | Monster incidents, wards, shop mood | `incidents` |
| Shared library | `packages/shared` | | Auth guard, DB pool and migrations, errors, money, domain lists, catalog client, test helpers | none |
| Cross-service tests | `tests/integration` | | Gateway + all services in one process | uses `griffin_test` |
| Browser journeys | `tests/e2e` | | Playwright against the running shop | |

Source: `docs/architecture.md:9-16`, `AGENTS.md:20-24`.

### Inside a service (catalog, patrons, incidents share one shape)

| File | Role | Example |
|---|---|---|
| `src/index.ts` | Start-up: read settings, create pool pinned to own schema, run migrations, build app, listen | `services/catalog/src/index.ts:5-11` |
| `src/app.ts` | `buildApp(deps)`: every route | `services/catalog/src/app.ts:59` |
| `migrations/NNN_*.sql` | Tables and demo data, applied in filename order | `services/catalog/migrations/003_add_tome_reorder_level.sql:1-2` |
| `test/` | `access.test.ts`, `<service>.test.ts`, `seed.test.ts` | `services/patrons/test/access.test.ts:33-43` |

Each route follows four steps (`docs/architecture.md:197-202`): **guard** with `requireStaff`, **validate** with zod, **act** with SQL on its own schema (plus catalog calls where needed), **respond** with camelCase JSON or an `HttpError`.

---

## Design Patterns Detected

| Pattern | Usage | Location |
|---|---|---|
| Dependency injection via `buildApp(deps)` | DB pool, JWT secret and `CatalogClient` are passed in, so tests swap in the test DB and a fake catalog | `services/patrons/src/app.ts:6-11`, `services/patrons/src/app.ts:39` |
| Client interface for service-to-service calls | `CatalogClient` with an HTTP implementation and a test fake | `packages/shared/src/catalogClient.ts:16-19`, `packages/shared/src/catalogClient.ts:21-42`, `packages/shared/src/testing.ts:43-77` |
| Route guard (preHandler) | `requireStaff(secret)` or `requireStaff(secret, 'owner')` | `packages/shared/src/auth.ts:42-58` |
| Central error handler | Zod errors become 400, `HttpError` keeps its status, anything else 500 | `packages/shared/src/errors.ts:17-31` |
| Schema-pinned pool | `search_path` set per service so queries use plain table names | `packages/shared/src/db.ts:10-12` |
| Migration runner | Each `.sql` file runs once, in a transaction, under an advisory lock | `packages/shared/src/db.ts:18-53` |
| Reverse-proxy routing table | Prefix to upstream to rewritten prefix | `services/gateway/src/app.ts:24-35` |
| Atomic check-and-update | Stock never below zero, even with concurrent sales | `services/catalog/src/app.ts:159-169` |

---

## Dependency Rules

```
portal ──HTTP /api/*──> gateway ──proxy──> catalog | patrons | incidents
                                           patrons, incidents ──CatalogClient──> catalog
every service ──import──> @griffin/shared          (portal imports nothing from services)
```

| Rule | Enforced by |
|---|---|
| A service reads and writes only its own schema; no cross-schema SQL, no cross-service foreign keys | Convention (`AGENTS.md:35`), schema-pinned pool (`packages/shared/src/db.ts:10-12`) |
| Other services change stock only through the catalog API, forwarding the caller's token | `services/patrons/src/app.ts:116-117`, `services/incidents/src/app.ts:87-90`; test `services/patrons/test/patrons.test.ts:121-125` |
| The catalog is the only service other services call | `docs/architecture.md:113` |
| Every service verifies the JWT itself; the gateway just forwards it | `services/gateway/src/app.ts:62-66`, `packages/shared/src/auth.ts:49` |
| The portal depends only on the API, keeping its own copy of types | `apps/portal/src/types.ts`, checked by `tests/integration/test/portalTypes.test.ts:118` |

**Violations to avoid:**
- Querying `catalog.tomes` from patrons or incidents, or adding a foreign key across schemas.
- Calling another service without forwarding `request.token`.
- Importing service code into `apps/portal`.

---

## Request Flows

### Signing in
`POST /api/auth/login` is handled by the gateway itself: look up staff in `auth.staff`, verify the scrypt hash, return a 12-hour JWT plus staff details (`services/gateway/src/app.ts:46-58`, `packages/shared/src/auth.ts:22-25`). The portal stores the token and sends it as `Authorization: Bearer` on every call (`apps/portal/src/api.ts:19-28`).

### Selling a tome (two services cooperate)
1. Gateway proxies `/api/sales` to patrons `/sales` (`services/gateway/src/app.ts:31`).
2. Patrons guards, validates, finds the patron (`services/patrons/src/app.ts:111-114`).
3. Patrons asks the catalog for price and title, then a negative stock adjustment, forwarding the token (`services/patrons/src/app.ts:116-117`).
4. Catalog adjusts stock atomically and writes the ledger, or answers 409 (`services/catalog/src/app.ts:153-182`).
5. Patrons records the sale, copying title and price at sale time (`services/patrons/src/app.ts:119-126`).

Known gap, deliberate: if step 5 fails, stock is not put back (backlog item 14; `services/patrons/test/patrons.test.ts:201`).

### Reporting a monster
Incidents optionally looks up the tome and removes damaged copies via the catalog, then logs the incident; the public shop mood changes (`services/incidents/src/app.ts:83-90`, `services/incidents/src/shopMood.ts`).

---

## Gateway Routing Table

Defined in `routingTable` (`services/gateway/src/app.ts:24-35`) and registered with `@fastify/http-proxy` (`services/gateway/src/app.ts:64-66`).

| Gateway path | Service | Upstream path |
|---|---|---|
| `/api/auth/*` | gateway itself | |
| `/api/public/tomes` | catalog | `/public/tomes` |
| `/api/public/patron-stats` | patrons | `/public/patron-stats` |
| `/api/public/shop-status` | incidents | `/public/shop-status` |
| `/api/tomes` | catalog | `/tomes` |
| `/api/patrons`, `/api/sales` | patrons | `/patrons`, `/sales` |
| `/api/incidents`, `/api/wards` | incidents | `/incidents`, `/wards` |
| other GET outside `/api/` | portal `index.html` | |

Unknown `/api/*` paths answer 404 `{ error }` (`services/gateway/src/app.ts:71-74`). Every entry is exercised by `services/gateway/test/routing.test.ts:78`.

---

## Portal

- Routes: `/` (Landing) and `/login` are public; everything under `/shop` needs a login (`apps/portal/src/App.tsx:21-29`).
- `api.ts` adds the token and unwraps errors (`apps/portal/src/api.ts:19`); `auth.tsx` exposes `isOwner` (`apps/portal/src/auth.tsx:43`).
- Owner-only controls are hidden from clerks (`apps/portal/src/pages/Tomes.tsx:36`), and owner-only data is not even requested (`apps/portal/src/pages/Dashboard.tsx:15`). The API is the real enforcement.
- `types.ts` and `lore.ts` are kept in step with the services by hand (`apps/portal/src/lore.ts:1-2`).

---

## Configuration and Environment

| Setting | Where | Accessed via |
|---|---|---|
| `PORT`, `DATABASE_URL`, `JWT_SECRET` | env, local-dev defaults | `loadBaseConfig` (`packages/shared/src/config.ts:13-19`) |
| `CATALOG_URL` / `*_HOSTPORT` | env | `serviceUrl` (`packages/shared/src/config.ts:25-30`) |
| `TEST_DATABASE_URL` | env, defaults to `griffin_test` | `packages/shared/src/config.ts:9-10` |
| `OWNER_PASSWORD`, `CLERK_PASSWORD`, `PORTAL_DIR` | gateway env | `docker-compose.yml:73-74`, `services/gateway/src/index.ts:20` |

Settings table for hosting: `docs/deployment.md`.

---

## Deployment

- `docker/Dockerfile` builds every workspace in one build (`docker/Dockerfile:17`); the `SERVICE` env var picks which service a container starts (`docker/Dockerfile:24`).
- `docker-compose.yml` builds that one Dockerfile into a **separate image per service** (`gilded-griffin-catalog`, `-patrons`, `-incidents`, `-gateway`) so parallel builds never race over one tag (`docker-compose.yml:10-13`, `docker-compose.yml:40`, `docker-compose.yml:49`, `docker-compose.yml:58`, `docker-compose.yml:67`).
- Only the gateway's 8080 is published, plus Postgres 5432 for local tests (`docker-compose.yml:27-28`, `docker-compose.yml:75-76`). `docker/init-test-db.sql:3` creates `griffin_test` on first volume creation.
- On start-up each service applies its own migrations; the gateway also seeds the two staff accounts (`services/gateway/src/index.ts:9-10`).
- Hosting options: Codespaces, Docker Compose, Render (`docs/deployment.md`).

---

## Adding New Features

### A new route on an existing service
1. Route in `services/<svc>/src/app.ts` with `preHandler` guard and zod schemas.
2. New numbered migration if the schema changes.
3. Gateway `routingTable` entry only if it introduces a new path prefix.
4. Tests: a row in `test/access.test.ts` plus the rule in `test/<svc>.test.ts`.
5. Portal: update `src/types.ts`, `src/lore.ts`, the page and its `*.test.tsx`.
6. Update `docs/api.md`.

### Using another service's data
Add a method to that service's client interface in `packages/shared` (as `CatalogClient`), implement it over HTTP forwarding the token, extend the test fake, and keep the contract test in `tests/integration/test/catalogContract.test.ts` in step.

---

## Boundaries Summary

| Do | Don't |
|---|---|
| Call the catalog through `CatalogClient`, forwarding `request.token` | Read another schema's tables |
| Copy title and price into your own rows at the time of the event | Add foreign keys across services |
| Pass dependencies into `buildApp` | Create pools or HTTP clients inside route handlers |
| Keep each service small and readable | Collapse services into one for convenience (`docs/purpose.md:51`) |

---

## Quick Reference

| Need | Location |
|---|---|
| Service entry point | `services/<svc>/src/index.ts` |
| Routes | `services/<svc>/src/app.ts` |
| Data access | Hand-written SQL in `app.ts` via `pg` (no ORM) |
| Service-to-service client | `packages/shared/src/catalogClient.ts` |
| Domain vocabulary | `packages/shared/src/domain.ts` |
| Routing table | `services/gateway/src/app.ts:24` |
| Configuration | `packages/shared/src/config.ts` |
| Architecture decisions | `docs/architecture.md:523-535` |
