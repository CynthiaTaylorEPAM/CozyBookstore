# Testing Patterns

**Project**: gilded-griffin
**Framework**: Vitest 5 in every workspace (`package.json:36`); Testing Library + jsdom for the portal (`apps/portal/package.json:13-19`); Playwright 1.65 + axe for browser journeys (`tests/e2e/package.json:10-12`)
**Coverage tool**: `@vitest/coverage-v8` (`package.json:30`) with per-workspace line floors
**Human source**: `docs/testing.md` (layers, what each covers, what to add with a change). The rule itself: `AGENTS.md:42`.

---

## Test Layers

The suite (added by PR #35) has four layers. A mistake should be caught by the lowest, fastest layer that can catch it (`docs/testing.md:26`).

| Layer | Where | What | Needs |
|---|---|---|---|
| 1. Unit | `packages/shared/src/*.test.ts`, `services/gateway/test/staff.test.ts`, `services/incidents/test/shopMood.test.ts`, `apps/portal/src/money.test.ts`, `apps/portal/src/lore.test.ts` | Money, tokens, guard, error shape, catalog client, config, passwords, shop mood | nothing (shared `db.test.ts` needs Postgres) |
| 2. Service | `services/*/test/*.test.ts` | Each service alone via `app.inject`, real `griffin_test` DB, fake catalog | `npm run db:up` |
| 3. Cross-service | `tests/integration/test/*.test.ts` | Gateway + all three services over real HTTP in one process | `npm run db:up` |
| 4a. Screens | `apps/portal/src/**/*.test.tsx` | Each page in jsdom with a pretend API, per role | nothing |
| 4b. Journeys | `tests/e2e/journeys/*.spec.ts` | Real Chromium against the running shop, per persona | running shop on :8080 |

Source: `docs/testing.md:9-14`, `docs/testing.md:70-119`.

### Per-service file convention

| File | Purpose | Example |
|---|---|---|
| `test/access.test.ts` | A table of every route as `anyone` / `staff` / `owner`, each tried as visitor, clerk and owner; fails if a route has no row. Also the validation edge table | `services/patrons/test/access.test.ts:33-69`, `services/patrons/test/access.test.ts:78-125` |
| `test/<service>.test.ts` | Business rules | `services/patrons/test/patrons.test.ts:97` |
| `test/seed.test.ts` | DB builds from empty; demo rows use only known domain values | `services/catalog/test/seed.test.ts` |
| `services/gateway/test/routing.test.ts` | Every `routingTable` entry reaches the right service and path with the token untouched | `services/gateway/test/routing.test.ts:78-96` |

Test names are plain-English shop behaviour: `it('records nothing when the catalog has too few copies')` (`services/patrons/test/patrons.test.ts:108`).

---

## Running Tests

| Action | Command | Source |
|---|---|---|
| Start Postgres (once per session) | `npm run db:up` | `package.json:24` |
| Layers 1 to 4a (all workspaces with a `test` script, including `tests/integration`) | `npm test` | `package.json:19` |
| Layers 1, 2, 4a with coverage floors (excludes integration) | `npm run test:coverage` | `package.json:20` |
| Integration only | `npm test -w @griffin/integration-tests` | `.github/workflows/ci.yml:37` |
| One workspace | `npm test -w @griffin/catalog` | workspace `package.json` `test: vitest run` |
| One file | `npx vitest run test/catalog.test.ts` from the workspace folder | |
| Browser journeys | `docker compose up --build` in one terminal, then `npm run test:e2e` | `package.json:21`, `docs/testing.md:48-58` |
| First-time browser download | `npx playwright install chromium` | `docs/testing.md:63` |

`npm test` builds `@griffin/shared` first, because services import its `dist/` (`package.json:16`, `packages/shared/package.json:5-6`).

---

## Service Tests: `app.inject` Against the Real Test Database

Every route change comes with tests in that service's `test/` folder, using `app.inject` against the real test database and `fakeCatalog()` (`AGENTS.md:42`).

| Avoid | Prefer |
|---|---|
| Mocking `pg` or the pool | `createPool(TEST_DATABASE_URL, '<schema>')` + `migrate(...)` in `beforeAll` (`services/patrons/test/patrons.test.ts:16-19`) |
| Leftover rows between tests | `TRUNCATE ... RESTART IDENTITY CASCADE` and reseed in `beforeEach` (`services/patrons/test/patrons.test.ts:21-26`) |
| Starting a server on a port | `app.inject({ method, url, headers, payload })` (`services/patrons/test/access.test.ts:51-52`) |
| Forgetting to close the pool | `afterAll(() => db.end())` (`services/patrons/test/patrons.test.ts:28-30`) |
| Running service test files in parallel | `fileParallelism: false`; files share one schema (`services/catalog/vitest.config.ts:5-6`) |

`griffin_test` is created by `docker/init-test-db.sql:3` on first volume creation; the URL defaults in `packages/shared/src/config.ts:9-10` and can be overridden with `TEST_DATABASE_URL`. CI provides it as a Postgres service container (`.github/workflows/ci.yml:12-25`).

---

## Fakes and Helpers (`packages/shared/src/testing.ts`)

| Helper | What it gives | Location |
|---|---|---|
| `staffHeaders('owner' \| 'clerk')` | `Authorization` header for Mirabel or Pip, signed with `TEST_JWT_SECRET` | `packages/shared/src/testing.ts:23-25` |
| `fakeCatalog()` | One tome (id 7, 3 copies, 1000 cp); records `adjustments` and `tokens`; `goDown()` simulates an outage | `packages/shared/src/testing.ts:43-77` |
| `listRoutes(app)` | Every route as `"METHOD /path"`, so access tests notice an unlisted route | `packages/shared/src/testing.ts:84-100` |
| `openShop()` | Gateway + services wired over real HTTP for integration tests | `tests/integration/test/shop.ts:38` |
| `pretendApi()` / `openPortal(path, as, api)` | Stubbed `fetch` with canned answers; open the portal as `MIRABEL`, `PIP` or `null` | `apps/portal/src/test/harness.tsx:38`, `apps/portal/src/test/harness.tsx:77` |
| Portal fixtures | `shopAnswers()`, sample tomes | `apps/portal/src/test/fixtures.ts` |
| `signIn()` / `backstage()` / `unique()` | Journey sign-in, API-side setup, unique names | `tests/e2e/journeys/shop.ts:11`, `tests/e2e/journeys/shop.ts:23`, `tests/e2e/journeys/shop.ts:31` |

| Avoid | Prefer |
|---|---|
| Calling the real catalog from patrons/incidents tests | `buildApp({ db, jwtSecret, catalog: fakeCatalog().client })` (`services/patrons/test/patrons.test.ts:24-25`) |
| Changing what the catalog answers without touching the fake | Update `fakeCatalog` and `tests/integration/test/catalogContract.test.ts` together (`AGENTS.md:42`) |
| Not checking the token is forwarded | `expect(catalog.tokens).toEqual([token, token])` (`services/patrons/test/patrons.test.ts:121-125`) |

---

## Both Roles Where Behaviour Differs

Tests cover visitor, clerk and owner wherever behaviour differs.

| Avoid | Prefer |
|---|---|
| Testing an owner route only as the owner | Clerk gets 403, owner gets the data (`services/patrons/test/patrons.test.ts:203-210`) |
| Adding a route without an access row | A row in `rules`; `has a rule for every route` fails otherwise (`services/patrons/test/access.test.ts:46-48`) |
| Checking only that a public route works | Also assert no personal data leaks (`services/patrons/test/access.test.ts:71-75`) |
| A portal test only as the owner | Open as `PIP` and assert owner controls are absent (`apps/portal/src/pages/Tomes.test.tsx:54-55`) |

---

## Business-Rule Patterns

| Pattern | Example |
|---|---|
| Table-driven validation with `it.each` | `services/patrons/test/access.test.ts:81-91` |
| Concurrency: 10 parallel requests, exactly 3 succeed | `services/catalog/test/catalog.test.ts:295-303` |
| Downstream outage records nothing | `services/patrons/test/patrons.test.ts:134-140` |
| Known gaps as `it.todo` so they show in every run | `services/patrons/test/patrons.test.ts:201` |

---

## Cross-Service and Contract Tests (`tests/integration`)

| File | Checks |
|---|---|
| `tests/integration/test/shop.test.ts` | A sale moves stock, writes the ledger, adds to takings; a monster report changes the mood; clerk kept out of owner business everywhere |
| `tests/integration/test/catalogContract.test.ts` | The fake catalog answers exactly like the real one (`tests/integration/test/catalogContract.test.ts:37-55`) |
| `tests/integration/test/portalTypes.test.ts` | Portal's hand-written `types.ts` matches real API answers; public tome omits staff-only fields (`tests/integration/test/portalTypes.test.ts:31`, `tests/integration/test/portalTypes.test.ts:118-130`) |

Files run one at a time (`tests/integration/vitest.config.ts:3-4`).

---

## Screen Tests (portal)

Each page's `*.test.tsx` sits next to the page. jsdom environment and setup are in `apps/portal/vite.config.ts:9-11`; each test starts with an empty page, nobody signed in and `fetch` restored (`apps/portal/src/test/setup.ts:5-10`). Check what the page shows, what it sends (`gateway.calls`, `apps/portal/src/pages/Tomes.test.tsx:25-33`), and what each role sees.

---

## Browser Journeys (`tests/e2e`)

- One file per kind of person, following `docs/personas.md`: `visitor.spec.ts`, `clerk.spec.ts`, `owner.spec.ts` (`docs/testing.md:111-117`).
- Run serially against one shop, 1 retry in CI, trace and screenshot on failure (`tests/e2e/playwright.config.ts:9-19`). `E2E_BASE_URL` targets another shop (`tests/e2e/playwright.config.ts:17`).
- Journeys create rows named `unique(<name from JOURNEY_NAMES>)` (`tests/e2e/journeys/shop.ts`). Playwright `globalSetup`/`globalTeardown` (`tests/e2e/tidy/`) remove those rows at the start and end of each run, only when the shop and database are both exactly `localhost`/`127.0.0.1`; `E2E_KEEP_DATA=1` skips it, to keep a failed journey's rows for inspection; a Codespace's forwarded address is not `localhost`, so it gets no tidy-up. The database is `E2E_DATABASE_URL` or the local dev database, never `DATABASE_URL`: anyone running `npm run dev` with their own database address must set `E2E_DATABASE_URL` to the same value. Run the journeys one at a time against a shop. A new journey name goes in `JOURNEY_NAMES`; a new table needs a step or a no-journey-data entry in `tests/e2e/tidy/remove.ts` (its coverage test fails otherwise). `npm test` runs `tests/e2e/tidy/*.test.ts` under Vitest against `griffin_test`. `docker compose down -v` is the full reset (`docs/testing.md`).
- The visitor journey includes an axe accessibility scan (`docs/testing.md:115`).

---

## Coverage

| Workspace | Line floor | Config |
|---|---|---|
| `packages/shared` | 90% | `packages/shared/vitest.config.ts:6` |
| each service | 85% | `services/catalog/vitest.config.ts:9` |
| `apps/portal` | 70% | `apps/portal/vite.config.ts:13` |

`index.ts` start-up files, test helpers and `types.ts` are excluded. The floor stops coverage sliding back; it is not the goal (`docs/testing.md:130`).

---

## What to Add With a Change

| If you change | Add or update |
|---|---|
| A route | Its row in `test/access.test.ts` and the rule in `test/<service>.test.ts`, for both roles where they differ |
| Something two services do together | `tests/integration/test/shop.test.ts` |
| What the catalog tells other services | `fakeCatalog` and `tests/integration/test/catalogContract.test.ts` |
| A field the portal reads | `apps/portal/src/types.ts` and its schema in `tests/integration/test/portalTypes.test.ts` |
| A portal page | The page's `*.test.tsx`, including what the clerk must not see |
| A start-to-finish task | A journey in `tests/e2e/journeys` |

Source: `docs/testing.md:132-141`.

---

## Troubleshooting

| Issue | Fix |
|---|---|
| `ECONNREFUSED 5432` | `npm run db:up`, wait for the healthcheck |
| `database "griffin_test" does not exist` | The volume predates `init-test-db.sql`; `docker compose down -v` then `npm run db:up` |
| Cannot find `@griffin/shared` types | Run via `npm test` (builds shared first) or `npm run build:shared` |
| Journeys fail at once | Shop not running on :8080, or Chromium not installed |
| Access test "has a rule for every route" fails | Add a row for the new route in `test/access.test.ts` |

---

## Deliberately Not Tested

Load and performance, penetration testing, pixel-perfect appearance, and `trailer/` (`docs/testing.md:151`).
