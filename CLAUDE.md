# The Gilded Griffin: guide for coding agents

A demo codebase: fantasy bookstore management. npm workspaces monorepo, TypeScript throughout. Read `docs/architecture.md` before a change that crosses services.

## Layout

- `packages/shared`: auth guard, DB pool and migration runner, error handling, money, domain vocabulary, catalog client. Used by all services.
- `services/catalog` (4001), `services/patrons` (4002), `services/incidents` (4003): Fastify + Postgres. Each has `src/app.ts` (routes), `src/index.ts` (start-up), `migrations/*.sql`, `test/`.
- `services/gateway` (8080): login, staff accounts, routing table, serves the built portal.
- `apps/portal`: React + Vite. `pages/Landing.tsx` is public; everything under `/shop` needs a login.

## Commands

- `npm run db:up` starts Postgres (needed for tests and dev).
- `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`. All four must pass before a change is done.
- `npm run dev` runs everything with reload. `docker compose up --build` runs the production images.

## Rules

- **Service boundaries.** A service reads and writes only its own Postgres schema. To use another service's data, call its API (see `CatalogClient` in `packages/shared`), forwarding `request.token`.
- **Schema changes** are new numbered files in that service's `migrations/`. Never edit a migration that has been merged.
- **Money** is an integer number of copper pieces (`priceCp`, `totalCp`). Never use floats. Format with `formatMoney`.
- **Auth.** Every non-public route has `preHandler: requireStaff(jwtSecret)` or `requireStaff(jwtSecret, 'owner')`. Public routes live under `/public/` and expose no personal data.
- **Validation.** Parse every request body, query and params with a zod schema. Valid values for races, monsters, genres and so on come from `packages/shared/src/domain.ts`.
- **New gateway-facing routes** need an entry in `routingTable` in `services/gateway/src/app.ts` if they introduce a new path prefix.
- **API shape.** JSON, camelCase. Errors are `{ "error": "message" }` with the right status code; throw `HttpError`.
- **Tests.** Every route change comes with tests in that service's `test/` folder, using `app.inject` against the real test database and a fake `CatalogClient`. Tests cover both roles where behaviour differs.
- **Portal.** Types in `src/types.ts` and display text in `src/lore.ts` are kept in step with the services by hand. Hide owner-only controls from clerks, but rely on the API to enforce it.
- **Docs.** Update `docs/api.md` when routes change.
- **Tone.** Light whimsy in user-facing text; plain, clear names in code.
