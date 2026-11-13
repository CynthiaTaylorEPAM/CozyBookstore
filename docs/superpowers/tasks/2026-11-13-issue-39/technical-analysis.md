# Technical Research

**Task**: e2e test-data cleanup database
**Generated**: 2026-11-13
**Research path**: filesystem

---

## 1. Original Context

GitHub Issue #39 (https://github.com/CynthiaTaylorEPAM/CozyBookstore/issues/39)
Title: "Test data is persisting after test runs"
Body: "After testing the \"Peek in the Window\" defect (Issue 37), test data remains in the database. I would like to have the test data cleaned up after runs" (plus a screenshot attachment not available as text).

Context: the current branch feature/shop-window-button holds the Issue 37 fix (recent commits: "Check in the browser that the hero button scrolls to the shop window", "Make the shop window journey prove the page actually scrolls"). Those e2e/integration tests likely create data (e.g. catalog books) that is never removed.

---

## 2. Codebase Findings

### Existing Implementations

**Purpose A: "After I run the tests, the shop I look at should not be full of test tomes, patrons and incidents."**
- Browser journeys write to the running shop's own database, `griffin` (`docker-compose.yml:15` `DATABASE_URL: postgres://griffin:griffin@db:5432/griffin`), the same database that holds the demo data the portal shows. They reach it only through the gateway API (`tests/e2e/playwright.config.ts:17`, `E2E_BASE_URL` default `http://localhost:8080`).
- `backstage(request, who)` (`tests/e2e/journeys/shop.ts:31-56`): signs in over `/api/auth/login`, offers `get`/`post`/`patch` only, plus `addTome` (POST `/tomes`, default 3 copies, 1000 cp, genre history) and `addPatron` (POST `/patrons`, race gnome). No delete or teardown. Used by every journey file.
- `unique(name)` (`tests/e2e/journeys/shop.ts:23-25`): appends a base-36 timestamp + random suffix, so journeys never collide with demo data or each other. It is the code's existing answer to leftover data (isolation, not removal). Leftover names follow recognisable prefixes: `Window Tome`, `Cabinet Tome` (`visitor.spec.ts:8-9`), `Stonesong`, `Risky Tome`, `Popular Tome`, `Loyal`, `Rattling in the stacks`, `Takings Tome`, `Spender` (`owner.spec.ts:6,35,57,83,97,123-124`), `Fizzwick`, `Sale Tome`, `Buyer`, `Scarce Tome`, `Latecomer`, `Gone Tome`, `Restock Tome`, `Chewed Tome`, `Crumbs everywhere`, `Fixed Price Tome`, `Hopeful` (`clerk.spec.ts:25-143`).
- Side effects beyond rows created: sales (`owner.spec.ts:125`, clerk sale journeys), stock adjustments (`clerk.spec.ts:84`), incidents (`owner.spec.ts:98`, `clerk.spec.ts:115-116`) which change the public mood until resolved. Tomes created with `featured: true` (`visitor.spec.ts:8-9`, `owner.spec.ts:6` via UI checkbox, `owner.spec.ts:35`) appear in the public shop window: `GET /public/tomes` returns `WHERE featured AND NOT restricted ORDER BY title` (`services/catalog/src/app.ts:69-74`). The `Window Tome …` rows from the Issue 37 journey are therefore visible on the landing page after a run.
- Manual reset today: `docker compose down -v` wipes the volume; migrations reseed demo data on next start (`docs/testing.md:66`, `docs/deployment.md:27-31`, seeds in `services/*/migrations/002_seed_demo_*.sql`). CI already does this (`.github/workflows/ci.yml` e2e job, final step `if: always()` `docker compose down -v`).

**Purpose B: "Automated (non-browser) tests should not leave data around."**
- Service tests and integration tests use a separate database `griffin_test` (`docker/init-test-db.sql:3`, `packages/shared/src/config.ts:9-10`), never `griffin`.
- Integration: `shop.reset()` (`tests/integration/test/shop.ts:84-101`) `TRUNCATE`s every table in all four schemas with `RESTART IDENTITY` and reseeds a fixture; called in `beforeEach` (`tests/integration/test/shop.test.ts:12-16`). `afterAll` only closes servers and pools (`shop.ts:103-106`); rows from the last test stay in `griffin_test`.
- Service tests: same `TRUNCATE … RESTART IDENTITY CASCADE` in `beforeEach`, `afterAll(() => db.end())` (`.ai-run/guides/testing/testing-patterns.md:60-63`). Same leftover-of-last-test property.

**Searched for and not found:** any `DELETE` route (`grep app.(get|post|patch|put|delete)` over `services/*/src/app.ts`, results: GET/POST/PATCH only); Playwright `globalSetup`/`globalTeardown`, `afterAll`/`afterEach` in `tests/e2e`; any cleanup script in `package.json`.

### Decisions Already in the Code
- **Journeys do not tidy up, by recorded choice**: `docs/testing.md:66` "They leave the demo data alone but do not tidy up after themselves; `docker compose down -v` gives you a fresh shop." Repeated in `.ai-run/guides/testing/testing-patterns.md:136`. Alternative: teardown. Reason recorded: none beyond isolation via `unique()` (`shop.ts:19-22`).
- **Journeys set up data through the public API, not the database** (`shop.ts:27-30`), and can target a remote shop via `E2E_BASE_URL` (`playwright.config.ts:6,17`; `docs/testing.md:66`). A remote shop gives no direct DB access.
- **No deletion anywhere in the product.** Tomes, patrons, sales, incidents have no delete route; `sales.patron_id REFERENCES patrons(id)` with no cascade (`services/patrons/migrations/001_create_patrons_and_sales.sql`); `sales.tome_id` and `incidents.tome_id` deliberately have no foreign key across services (same files, comments). `stock_adjustments.tome_id … ON DELETE CASCADE` (`services/catalog/migrations/001_create_tomes.sql`).
- **Service boundaries**: a service reads/writes only its own schema; cross-service via API (`AGENTS.md` Rules). The integration `reset()` bypasses this by holding a pool per schema, a test-only exception.
- **One shared shop, serial runs**: `workers: 1`, `fullyParallel: false` (`playwright.config.ts:10-12`).
- **Test DB separate from demo DB**: `docker/init-test-db.sql:2` "so they never touch demo data".
- **Schema changes are new numbered migrations; never edit merged ones** (`AGENTS.md`).

### Task Statements Checked Against the Code
- "test data remains in the database" after testing Issue 37: **holds** for the browser journey. `visitor.spec.ts:8-9` adds two featured tomes to the `griffin` DB on every run with no removal. The Issue 37 commits (`git diff 9bdbfb1..HEAD -- tests/`) only added scroll assertions to that journey; they did not add data creation; the tome creation predates them.
- "Those e2e/integration tests likely create data (e.g. catalog books) that is never removed": **holds for e2e** (see Purpose A). **Partly contradicted for integration**: integration and service tests write only to `griffin_test` and truncate before each test (`shop.ts:84-88`); only the last test's fixture rows persist, and never in the demo database.
- "I would like to have the test data cleaned up after runs": **keeps in place / conflicts with** the recorded decision in `docs/testing.md:66` and the `unique()` isolation approach (consumers: all three journey files). The screenshot was not available; which screen it shows is **unverified**.

### Consumers of Changed Contracts
- `backstage()` / `unique()` in `tests/e2e/journeys/shop.ts`: imported by `visitor.spec.ts:3`, `owner.spec.ts:2`, `clerk.spec.ts:2`.
- Text describing current behaviour: `docs/testing.md:66`, `.ai-run/guides/testing/testing-patterns.md:136`.
- If any route were added: `routingTable` (`services/gateway/src/app.ts:24-35`) proxies by prefix (`app.ts:64-66`), all methods; `services/catalog/test/access.test.ts` "has a rule for every route" fails without a row; `docs/api.md`.
- CI e2e job (`.github/workflows/ci.yml`) runs `npm run test:e2e` then `docker compose down -v`.

### Architecture and Layers Affected
- Test layer 4b (Playwright journeys, `tests/e2e`). Possibly test layers 2/3 (`tests/integration/test/shop.ts`, `services/*/test`). Docs (`docs/testing.md`). Services/gateway only if a removal path is added through the API.

### Integration Points
- Journeys → gateway :8080 → catalog/patrons/incidents → Postgres `griffin` (schemas `catalog`, `patrons`, `incidents`, `auth`).
- Integration tests → in-process services → Postgres `griffin_test` at `TEST_DATABASE_URL`.

### Patterns and Conventions
- Journey helpers live in `tests/e2e/journeys/shop.ts`; tests read as shop behaviour in plain English.
- DB resets in tests use `TRUNCATE … RESTART IDENTITY CASCADE` + reseed (`shop.ts:84-101`).
- Playwright config is minimal; no fixtures beyond built-in `page`/`request`.

---

## 3. Documentation Findings

### Guides and Architecture Docs
- `.ai-run/guides/testing/testing-patterns.md` (layers, helpers, the "do not clean up" note at line 136).
- `docs/testing.md` (human source; lines 48-66 cover running journeys and the reset).
- `docs/deployment.md:27-31` (`docker compose down -v` to wipe).

### Architectural Decisions
- Test DB separation (`docker/init-test-db.sql`); journeys untidy by design (`docs/testing.md:66`). No ADR files.

### Derived Conventions
- Docs and PR text written for a non-technical reader (`AGENTS.md`); `docs/testing.md` must change in step with any behaviour change.

---

## 4. Testing Landscape

### Existing Coverage
- Journeys: `visitor.spec.ts` (shop window, Issue 37 scroll, axe), `owner.spec.ts`, `clerk.spec.ts`.
- Integration: `shop.test.ts`, `catalogContract.test.ts`, `portalTypes.test.ts`, all on `shop.reset()`.

### Testing Framework and Patterns
- Playwright ^1.65, `@axe-core/playwright` (`tests/e2e/package.json`); Vitest 5 elsewhere. e2e is not in `npm test`; requires the running shop.

### Coverage Gaps
- No test asserts the shop is left as found after journeys. Nothing verifies `unique()`-named rows are absent after a run.

---

## 5. Configuration and Environment

### Environment Variables
- `E2E_BASE_URL` (journey target), `OWNER_PASSWORD`, `CLERK_PASSWORD` (`shop.ts:5-6`), `CHROMIUM_PATH`, `CI` (`playwright.config.ts`), `DATABASE_URL` (`docker-compose.yml:15`), `TEST_DATABASE_URL` (`config.ts:9-10`).

### Configuration Files
- `tests/e2e/playwright.config.ts`, `docker-compose.yml` (volume `griffin-data`), `docker/init-test-db.sql`, `.github/workflows/ci.yml`.

### Feature Flags and Deployment Concerns
- No flags. Postgres port 5432 is published to the host (`docker-compose.yml`), so the `griffin` DB is reachable locally; a remote `E2E_BASE_URL` shop (e.g. Render, `render.yaml`) is reachable only via the API.

---

## 6. Risk Indicators

- No delete capability exists in any service; removing journey rows through the API is not possible today (Decisions).
- Recorded decision `docs/testing.md:66` says journeys do not tidy up; the request reverses it, so docs and guide must change together.
- Sales reference patrons with a non-cascading FK; incidents and sales reference tomes with no FK across services. Removing a tome leaves sales/incident rows pointing at it; removing a patron with sales fails unless sales go first.
- Journeys have side effects beyond new rows: stock changes, open incidents changing the public mood, takings totals. "Cleaned up" may mean more than deleting created rows.
- `E2E_BASE_URL` lets journeys run against a remote shop with no DB access (`playwright.config.ts:17`).
- Service boundary rule (`AGENTS.md`): direct cross-schema access is only precedented in test code (`tests/integration/test/shop.ts`).
- Speculative: wiping the whole `griffin` DB would also remove any demo edits a presenter made by hand before the offsite session.
- Screenshot unavailable; which leftover data the reporter saw is unverified (most likely the `Window Tome …` rows in the public shop window, `services/catalog/src/app.ts:69-74`).
- Backlog item 7 embargo not touched by this task.

---

## 7. Summary for Complexity Assessment

The leftover data comes from the Playwright browser journeys (`tests/e2e/journeys/*.spec.ts`), which create tomes, patrons, sales, stock adjustments and incidents in the live shop's `griffin` database through the gateway API and never remove them. The repository records this as deliberate (`docs/testing.md:66`), relying on `unique()` names for isolation and `docker compose down -v` (already run in CI) for a reset. The Issue 37 journey adds two featured tomes per run, which then show on the public landing page. Integration and service tests use a separate `griffin_test` database and truncate before each test, so they do not touch the demo data.

The change surface is concentrated in the test layer: `tests/e2e/journeys/shop.ts`, `tests/e2e/playwright.config.ts`, the three spec files, and `docs/testing.md` plus the testing guide. The novel part is that nothing in the product can delete data. There are no DELETE routes, sales hold a non-cascading FK to patrons, and cross-service tome references have no FK. No existing Playwright setup or teardown hooks exist to extend.

Test coverage of the journeys themselves is good, but nothing checks that the shop is left clean. Key risks: reversing a recorded decision; the remote `E2E_BASE_URL` mode, where there is no DB access; side effects such as mood, stock and takings that go beyond the created rows; and the service-boundary rule, if cleanup reaches into schemas directly.

---

## 8. External References

- `https://github.com/CynthiaTaylorEPAM/CozyBookstore/issues/39`: the issue text is quoted in Section 1 as supplied by the caller. Not fetched; the screenshot attachment is unavailable as text.
- Issue 37 artifacts in repo: `docs/superpowers/tasks/2026-11-13-defect-fix-issue-37/` (not re-read; the relevant test diff was checked via `git diff 9bdbfb1..HEAD -- tests/`, which only adds scroll assertions to `visitor.spec.ts:19-25`).

## Facts Added by Review

Researched for the names the spec relies on, after the analysis above was written. Read like the facts layer; where a line here contradicts one above, this one was read later.

- **What it holds**: 11 in-world personas (table at `docs/personas.md:9-21`): staff Mirabel Thistlewick (owner, signs in as `owner`) and Pip Underbough (clerk); visitor Sir Aldric Fenn (public landing page only); patrons Grusha, Ilyana, Kessandra; author Orsolya; outsiders Quillon, Bran, Hesper, Edda (not represented in the system). Each has "Uses today", "What gets in her/their way", "Would value most" (backlog numbers) and one journey.
- **No persona for the test runner / presenter / developer.** Every persona is a shop character. Nobody in the file runs tests, `npm run test:e2e`, or presents the demo. The spec's primary beneficiary ("whoever runs `npm run test:e2e` ... before showing it") is not defined in `docs/personas.md`; the real-world audience (offsite presenters, directors) is described in `docs/purpose.md` instead (per `AGENTS.md:9-10`).
- `docs/personas.md:106` (Aldric, "What gets in his way"): "The shop window shows six favourites." `:111` Aldric "Uses today. The public landing page: shop window, wards, opening hours." This is the persona who sees the shop window that journey-created featured tomes (`unique('Window Tome')`, `unique('Cabinet Tome')`, `tests/e2e/journeys/visitor.spec.ts:8-9`; `unique('Risky Tome')` featured, `owner.spec.ts:35`) clutter today. Closest match for the spec's "Visitors to the shop window".
- `docs/personas.md:23`: "Mirabel, Pip and the six patrons and authors above already appear in the demo data." Confirmed in seeds: patrons Ilyana, Grusha, Aldric, Orsolya, Kessandra in `services/patrons/migrations/002_seed_demo_patrons.sql:3,5,9,10,13`; persona authors on tomes in `services/catalog/migrations/002_seed_demo_tomes.sql:2,5,11,14,16`; Mirabel and Pip as staff accounts in `services/gateway/src/staff.ts:15-16` (not database rows). These are the demo rows the spec's AC2 must leave untouched.
- The file describes no test data, cleanup, database or e2e behaviour. `docs/personas.md:359` rule: update a persona's "uses today"/"what gets in their way" when a feature removes a frustration. No persona frustration names leftover test data.
- `AGENTS.md:14` — use personas when elaborating/reviewing; update a persona when a feature removes a frustration.
- `docs/testing.md:111` — journeys are "one file per kind of person, following personas.md" (`visitor.spec.ts`, `clerk.spec.ts`, `owner.spec.ts`; table `:113-117`). Also `.ai-run/guides/testing/testing-patterns.md:134`.
- `.ai-run/guides/project.md:43` and `.ai-run/guides/standards/git-workflow.md:68-69` — PR body "Who it is for" names personas; "docs touched (`docs/api.md`, personas)".
- `.ai-run/guides/product/product-context.md:4,65,76,78,84,86`.
- `docs/backlog.md:5,35,37`, `docs/story.md:5,79,99,198`, `README.md:61`.
- Prior run precedent: low-stock task edited `docs/personas.md:46` (Mirabel's frustration) because the feature removed it (PR #34, per `product-context.md:84`).
- Personas are shop characters mapped to roles `owner`, `clerk`, anonymous visitor (`docs/personas.md:349`; `packages/shared/src/domain.ts:5` per `product-context.md:86`). The file has no category for people working on the codebase.
- "Visitors to the shop window are affected too": **holds** — Aldric (`docs/personas.md:92-115`) is the visitor persona whose only use is the landing page and shop window.
