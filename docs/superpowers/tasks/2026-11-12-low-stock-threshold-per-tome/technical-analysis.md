# Technical Research

**Task**: catalog stock reorder-level portal
**Generated**: 2026-11-12
**Research path**: filesystem

---

## 1. Original Context

GitHub issue #8 (CynthiaTaylorEPAM/CozyBookstore), title "1. Low-stock threshold per tome", label "small". Body: "Some tomes I want to reorder at five copies, others at one." Add a reorder level to each tome, then use it on the counter's Running Low panel in place of the fixed value of 2. Touches: Catalog and portal. Source: docs/backlog.md, item 1. No explicit acceptance criteria in the issue.

---

## 2. Codebase Findings

### Existing Implementations

**Purpose A: "Tell me which tomes are running low, by each tome's own reorder point" (Mirabel, owner; Pip sees the counter too).**
- `apps/portal/src/pages/Dashboard.tsx:8` `const LOW_STOCK = 2;` the only low-stock threshold in the repo. Used once, at `Dashboard.tsx:19`: `tomes.data.filter((tome) => tome.stock <= LOW_STOCK)`. Rule: inclusive (`<=`), so 0, 1 and 2 copies all count; includes restricted tomes; no sort beyond the `/tomes` API order (by title); no limit on items shown.
- Rendered at `Dashboard.tsx:85-102` ("Running low" panel): title plus "None left" / "N left"; empty text "Every shelf is comfortably full."; link to `/shop/tomes`. Shown to both roles (no `isOwner` gate).
- Data comes from `useLoad<Tome[]>('/tomes')` (`Dashboard.tsx:13`), the staff list route. The same array also feeds the "Tomes on the shelves" total (`Dashboard.tsx:57`).
- Seed data (`services/catalog/migrations/002_seed_demo_tomes.sql`): under the current rule 4 of 18 tomes show (stock 2, 0, 1, 1: "A Brief History…", "Letters to a Lighthouse Keeper", "Necronomnomnomicon", "True Names of Lesser Demons").
- None found server side: searched `low|reorder|threshold|LOW_STOCK` across `services/`, `packages/`. The catalog has no low-stock query or field.

**Purpose B: "Let me set the reorder level for each tome" (owner).**
- None found. `tomes` table (`services/catalog/migrations/001_create_tomes.sql:1-13`) has `stock` (`INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0)`) and no reorder/threshold column.
- Nearest mechanism: owner-only tome add/edit: `services/catalog/src/app.ts:80` (POST `/tomes`), `:100` (PATCH `/tomes/:id`), schemas `newTome` (`app.ts:18-28`) and `tomeChanges = newTome.omit({ stock: true }).partial()` (`app.ts:30`). Portal form `TomeDialog` in `apps/portal/src/pages/Tomes.tsx` (~line 195 onward), opened by owner-only buttons. Fields shown: title, author, genre, condition, price, copies (add only), description, featured, restricted.

**Other touched code**
- `services/catalog/src/app.ts:13-14` `TOME_COLUMNS`: one column list shared by every tome-returning query, including the public `/public/tomes` route (`app.ts:52-57`) and the stock-adjustment `RETURNING` (`app.ts:140`).
- `apps/portal/src/types.ts:13-24` `Tome` interface (hand-synced with the API).
- `docs/api.md:19-27` catalog route table; `docs/architecture.md:220-232` ER diagram of `tomes`.

### Decisions Already in the Code
- Threshold lives in the portal as a constant, not in the catalog; no recorded reason found.
- Columns are snake_case, aliased to camelCase in `TOME_COLUMNS` (`app.ts:12-14`, comment "Database columns are snake_case; the API speaks camelCase.").
- PATCH uses `COALESCE($n, column)` per field with `?? null` (`app.ts:104-124`): a field cannot be set to NULL through PATCH; omitted fields are unchanged. Each field is an explicit positional parameter (no dynamic SQL).
- `tomeChanges` derives from `newTome`, so any field added to `newTome` becomes PATCHable unless omitted (as `stock` is). `stock` is deliberately excluded: stock changes only via `/stock-adjustments` (ledger) (`docs/architecture.md:525`).
- Schema changes are new numbered SQL files (`migrations/001_`, `002_`); runner `packages/shared/src/db.ts:18-48` applies unapplied files in name order, tracked in `schema_migrations`. CLAUDE.md: never edit a merged migration.
- Validation via zod with `.int().min(0)` style for counts (`app.ts:23-24`); DB enforces non-negativity with `CHECK` (`001_create_tomes.sql:7-8`).
- Add/edit is owner-only (`ownerOnly` preHandler); portal hides owner controls from clerks but relies on API enforcement (CLAUDE.md).

### Task Statements Checked Against the Code
- "the counter's Running Low panel … fixed value of 2": holds (`Dashboard.tsx:8,19,86`).
- "Touches: Catalog and portal": holds as far as the current code shows; the threshold is in the portal and tome storage is in the catalog. Gateway routing needs no new prefix for existing `/api/tomes` paths (`services/gateway/src/app.ts` routing table); patrons/incidents read only `TomeSummary` (`packages/shared/src/catalogClient.ts:4-9`: id, title, priceCp, stock).
- "Add a reorder level to each tome": no existing field to reuse (Purpose B).
- Label "small": consistent with surface found (one table, one route file, two portal pages).

### Consumers of Changed Contracts
- `tomes` table / `TOME_COLUMNS` (`app.ts:13`): read by GET `/public/tomes` (`app.ts:54`), GET `/tomes` (`:63`), GET `/tomes/:id` (`:74`), POST/PATCH `RETURNING` (`:84,:113`), stock-adjustment `RETURNING` (`:140`). A column added to `TOME_COLUMNS` reaches all of these, including the unauthenticated `/public/tomes` response used by `apps/portal/src/pages/Landing.tsx:33`.
- `newTome` / `tomeChanges` zod schemas: consumers are POST/PATCH only; `catalog.test.ts:65-87` posts/patches tomes without any new field (relies on defaults).
- `Tome` type (`types.ts:13`): used by `Dashboard.tsx`, `Tomes.tsx`, `Incidents.tsx` (tome picker, `:177-190`), `Landing.tsx`. Adding a field is additive for all.
- `TomeSummary` / `CatalogClient.getTome`, `adjustStock` (`catalogClient.ts`): patrons and incidents services and their fake clients in tests. They type only four fields; extra JSON fields are ignored.
- Test seed INSERT in `services/catalog/test/catalog.test.ts:24-28` lists columns explicitly; a new column with a DB default leaves it valid.
- `LOW_STOCK` constant: single consumer (`Dashboard.tsx:19`).

### Architecture and Layers Affected
- Data: `services/catalog/migrations/` (Postgres schema `catalog`).
- Service/API: `services/catalog/src/app.ts` (columns, zod schemas, INSERT/UPDATE).
- Portal UI: `apps/portal/src/types.ts`, `pages/Dashboard.tsx` (Running low), `pages/Tomes.tsx` (`TomeDialog`, optionally the table).
- Docs: `docs/api.md`, `docs/architecture.md` ER diagram, `docs/personas.md` (Mirabel frustration "Reordering lives in her head", line 46).

### Integration Points
- Portal → gateway `/api/tomes*` → catalog. No cross-service call involved in the dashboard filter.
- Patrons/incidents → catalog via `CatalogClient` (unaffected unless `TomeSummary` changes).

### Patterns and Conventions
- Fastify `buildApp(deps)` factory, `registerErrorHandler`, `HttpError`/`notFound`, `requireStaff(secret[, 'owner'])`.
- Portal: `useLoad<T>(path)`, `api(path, {method, body})`, `Modal` dialogs; form state object with `set(changes)`.

---

## 3. Documentation Findings

### Guides and Architecture Docs
- No `.ai-run/guides/` (only `.ai-run/sdlc-factory/doctor.json`). Conventions from `CLAUDE.md`, `docs/architecture.md`.
- `docs/backlog.md:9` item 1 (source text); `docs/personas.md:46,53,251` (Mirabel; the Scribes' Guild factor persona: backlog 12 "supported by backlog 1"); `docs/story.md:104`; `trailer/trailer.js:560` quotes the request.

### Architectural Decisions
- `docs/architecture.md:525`: stock changes only through the catalog's adjustment endpoint (ledger).
- `docs/architecture.md:113`: catalog is the only service others call.
- CLAUDE.md: public routes expose no personal data; docs/api.md updated on route change; tests per route change, both roles where behaviour differs.

### Derived Conventions
- Integer copies, `CHECK (>= 0)` in SQL, zod `.int().min(0)` in API; defaults declared in both DB and zod (`stock` default 0 in both).

---

## 4. Testing Landscape

### Existing Coverage
- `services/catalog/test/catalog.test.ts`: auth on list, list/search/filter, public window filter, owner add, clerk forbidden on add, unknown genre rejected, owner reprice leaves others intact, stock adjustments and ledger, 409 on overdraw, 404.

### Testing Framework and Patterns
- Vitest (`^5.1.0` root). `app.inject` against real test DB (`TEST_DATABASE_URL`, `migrate` in `beforeAll`), `TRUNCATE … RESTART IDENTITY` + explicit seed INSERT in `beforeEach`, owner/clerk tokens via `signToken`. Requires `npm run db:up`.

### Coverage Gaps
- No portal component/page tests exist (only `apps/portal/src/money.test.ts`); the Running low filter in `Dashboard.tsx` is untested and the repo has no React testing setup.
- No test for clerk PATCH being refused (only clerk POST).
- No test asserting the shape of `/public/tomes` beyond filtering.

---

## 5. Configuration and Environment

### Environment Variables
- None specific to stock/threshold. Catalog uses DB URL and JWT secret (`services/catalog/src/index.ts`).

### Configuration Files
- None govern the threshold; it is a source constant.

### Feature Flags and Deployment Concerns
- No feature flags. Migrations run at service start-up (`migrate` in `db.ts`), so Docker/Codespaces/`render.yaml` deployments pick up a new migration automatically.

---

## 6. Risk Indicators

- `TOME_COLUMNS` is shared with the unauthenticated `/public/tomes` route (`app.ts:52-57`); any new column added there becomes public on the landing-page API. See Consumers of Changed Contracts.
- PATCH `COALESCE` pattern (`app.ts:104-124`) cannot clear a value to NULL; relevant only if the level is nullable. See Decisions Already in the Code.
- Speculative: the change probably needs a new migration file `003_…` in `services/catalog/migrations/` with a default, so existing rows and the test seed keep working; the seed currently yields 4 tomes on the panel, and the chosen default changes what the demo dashboard shows.
- Portal behaviour (the dashboard filter) has no test harness; verification of the panel will be manual or need new setup.
- Comparison semantics: current rule is inclusive (`stock <= 2`); the issue's "reorder at five copies" does not state inclusive vs. exclusive.
- Issue has no acceptance criteria: who may set the level (owner-only edit dialog today) and whether clerks see it are undecided.
- Docs to keep in step: `docs/api.md`, `docs/architecture.md` ER diagram, `docs/personas.md:46` (Mirabel frustration).

---

## 7. Summary for Complexity Assessment

The change spans two existing layers inside one service plus the portal: the catalog's Postgres schema and route file (`services/catalog/migrations/`, `services/catalog/src/app.ts`) and three portal files (`types.ts`, `pages/Dashboard.tsx`, `pages/Tomes.tsx`), plus docs. No gateway, shared-package or cross-service contract changes are implied by the current code: the threshold today is a single portal constant (`LOW_STOCK = 2`) with one consumer, and the `tomes` table has no reorder field.

Technical novelty is low. Every needed pattern exists: numbered SQL migrations auto-applied at start-up, snake_case-to-camelCase aliasing in `TOME_COLUMNS`, zod schemas where `tomeChanges` derives from `newTome`, per-field `COALESCE` updates, an owner-only `TomeDialog` form, and `useLoad` data loading on the dashboard.

Catalog API tests are solid and follow a clear `app.inject` pattern with owner/clerk tokens; portal pages have no tests and no React test harness. Key risks: the shared `TOME_COLUMNS` leaking a new field onto the public route, the default value for existing tomes (affects the demo dashboard), inclusive vs. exclusive comparison, and the absence of acceptance criteria.

---

## 8. External References

None named by the task beyond in-repo `docs/backlog.md` item 1 (line 9): "**Low-stock threshold per tome.** 'Some tomes I want to reorder at five copies, others at one.' Add a reorder level to each tome and use it on the counter's Running Low panel instead of the fixed value of 2. *Catalog, portal.*"

## Facts Added by Review

Researched for the names the spec relies on, after the analysis above was written. Read like the facts layer; where a line here contradicts one above, this one was read later.

- CLAUDE.md "Portal" rule: "Types in `src/types.ts` and display text in `src/lore.ts` are kept in step with the services by hand." `docs/architecture.md:496` describes lore.ts as "Display text for races, monsters, tiers"; `docs/story.md:191` cites `GENRE_COLOURS` in lore.ts.
- "Wording goes through `src/lore.ts` if the panel's existing text lives there" (spec.md:14): **condition is false** - the panel's existing text lives inline in `Dashboard.tsx` (l.86-100), so by the spec's own condition the wording stays in `Dashboard.tsx`.
- "instead of the fixed 2": holds - `LOW_STOCK = 2` at `Dashboard.tsx:8`, used only at l.19 (no other reference in `apps/portal/src`).
- `components/BookCover.tsx:1` - `GENRE_COLOURS`
- `pages/Dashboard.tsx:3` - `MOODS, MONSTERS`
- `pages/Incidents.tsx:5` - `MONSTERS, SEVERITIES`
- `pages/Landing.tsx:6` - `MONSTERS, MOODS, RACES`
- `pages/PatronDetail.tsx:5` - `RACES, TIERS`
- `pages/Patrons.tsx:5` - `RACES, TIERS`
- `pages/Tomes.tsx:6` - `CONDITIONS, GENRES`
