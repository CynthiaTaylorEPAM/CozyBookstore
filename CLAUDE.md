# The Gilded Griffin: guide for coding agents

A demo codebase: fantasy bookstore management. npm workspaces monorepo, TypeScript throughout. Read `docs/architecture.md` before a change that crosses services.

## Why this exists

Read `docs/purpose.md` at the start of a session. In short: this is the example codebase for an EPAM Canada leadership offsite, where directors and above from delivery and account management learn to set up and use an SDLC hyperfactory (agents taking a feature request through elaboration, planning, development, testing and deployment). Many of them are not hands-on technical. So:

- Keep it a small, readable, working skeleton. The gaps in `docs/backlog.md` are deliberate; build one only when asked. Backlog item 7 (the bounty board) is reserved for the session itself and must not land on `main` beforehand.
- Keep it representative: database, separate services, gateway, portal, roles.
- Keep it runnable with one click (Codespaces) or one command (Docker), and keep `main` demonstrable.
- Write docs, pull request descriptions and user-facing text for a non-technical reader.

When elaborating or reviewing a feature, use the personas in `docs/personas.md`: name who the feature is for and who else it affects. Update a persona when a feature removes one of its frustrations.

For anything that tells the story (the trailer video, slides, in-character feature requests), start from `docs/story.md`. It marks which parts are established and which are only proposed.

## Layout

- `packages/shared`: auth guard, DB pool and migration runner, error handling, money, domain vocabulary, catalog client. Used by all services.
- `services/catalog` (4001), `services/patrons` (4002), `services/incidents` (4003): Fastify + Postgres. Each has `src/app.ts` (routes), `src/index.ts` (start-up), `migrations/*.sql`, `test/`.
- `services/gateway` (8080): login, staff accounts, routing table, serves the built portal.
- `apps/portal`: React + Vite. `pages/Landing.tsx` is public; everything under `/shop` needs a login.
- `tests/integration`: the gateway and all services run together. `tests/e2e`: browser journeys (Playwright).

## Commands

- `npm run db:up` starts Postgres (needed for tests and dev).
- `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`. All four must pass before a change is done.
- `npm run test:coverage` adds a coverage report and enforces the floors. `npm run test:e2e` runs the browser journeys against a running shop (`docker compose up --build`).
- `npm run dev` runs everything with reload. `docker compose up --build` runs the production images.

## Rules

- **Service boundaries.** A service reads and writes only its own Postgres schema. To use another service's data, call its API (see `CatalogClient` in `packages/shared`), forwarding `request.token`.
- **Schema changes** are new numbered files in that service's `migrations/`. Never edit a migration that has been merged.
- **Money** is an integer number of copper pieces (`priceCp`, `totalCp`). Never use floats. Format with `formatMoney`.
- **Auth.** Every non-public route has `preHandler: requireStaff(jwtSecret)` or `requireStaff(jwtSecret, 'owner')`. Public routes live under `/public/` and expose no personal data.
- **Validation.** Parse every request body, query and params with a zod schema. Valid values for races, monsters, genres and so on come from `packages/shared/src/domain.ts`.
- **New gateway-facing routes** need an entry in `routingTable` in `services/gateway/src/app.ts` if they introduce a new path prefix.
- **API shape.** JSON, camelCase. Errors are `{ "error": "message" }` with the right status code; throw `HttpError`.
- **Tests.** Read `docs/testing.md`. Every route change comes with tests in that service's `test/` folder, using `app.inject` against the real test database and `fakeCatalog()` from `@griffin/shared`: a row in `access.test.ts` (who may use it, tried as visitor, clerk and owner) and the business rule in `<service>.test.ts`. A change across services gets a test in `tests/integration`; a portal page change updates its `*.test.tsx`, including what the clerk must not see; a new start-to-finish task gets a journey in `tests/e2e`. If the catalog's answers to other services change, update `fakeCatalog` and `catalogContract.test.ts` together.
- **Portal.** Types in `src/types.ts` and display text in `src/lore.ts` are kept in step with the services by hand. Hide owner-only controls from clerks, but rely on the API to enforce it.
- **Docs.** Update `docs/api.md` when routes change.
- **Tone.** Light whimsy in user-facing text; plain, clear names in code.
