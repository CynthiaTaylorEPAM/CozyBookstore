# Browser journeys tidy up after themselves (Issue #39) Implementation Plan

> **For agentic workers:** implement task by task; steps use checkbox (`- [ ]`) syntax. Commit per task using the repository's existing convention.

**Goal:** Every local `npm run test:e2e` run removes the tomes, patrons, sales and incidents the journeys created, at its start and its end, and leaves everything else alone.

**Architecture:** `tests/e2e/journeys/shop.ts` owns the journey names and the matcher. A new `tests/e2e/tidy/` module holds the guard, the four removal steps (one transaction, plain `pg`) and a never-throwing `runTidyUp`, wired in as Playwright `globalSetup` / `globalTeardown`. Vitest is added to `tests/e2e` (unit and `griffin_test` tests only, never the journeys) so `npm test` runs the AC8/AC9 tests.

**Tech Stack:** TypeScript, Playwright ^1.65, Vitest 5 (root devDependency), `pg` ^8.23.1, `@griffin/shared`.

**Spec:** `docs/superpowers/tasks/2026-11-13-issue-39/spec.md`

## Global Constraints

- No service, route, gateway, portal or migration changes. No CI workflow change.
- `DATABASE_URL` is never read. Database = `E2E_DATABASE_URL` ?? `DEV_DATABASE_URL` (`packages/shared/src/config.ts:8`).
- Local means the parsed hostname is exactly `localhost` or `127.0.0.1`, for both `E2E_BASE_URL` (default `http://localhost:8080`) and the database URL.
- Messages name the database host only, never the connection string.
- `E2E_KEEP_DATA=1` turns both steps off, with one line saying so.
- A tidy-up problem never changes the journeys' pass/fail and never throws out of a hook.

## Review Focus

1. Lookalike demo or hand-made rows ("Loyal Grusha", "Window Tome" with no code, "Window Tome of Doom") must survive. Task 1 and Task 2 tests.
2. A database that refuses or is unreachable must give one warning, not a failed run. Task 3 test (`localhost:1`).
3. An unparseable `E2E_BASE_URL` / `E2E_DATABASE_URL`, or `localhost.example.com`, must skip, not tidy. Task 3 test.
4. A step that fails partway removes nothing (transaction rollback). Task 2 test.
5. A sale of a test tome to a *demo* patron goes; the demo patron stays. Task 2 test.

---

### Task 1: Journey names and the matcher in `shop.ts`, plus a Vitest runner in `tests/e2e`

**Files:**
- Modify: `tests/e2e/journeys/shop.ts:19-25` (type `unique`, add the list and matcher)
- Modify: `tests/e2e/package.json` (add `"test": "vitest run"`; deps `pg` ^8.23.1, `@griffin/shared` ^0.1.0; devDep `@types/pg` ^8.23.1, matching `tests/integration/package.json`)
- Modify: `tests/e2e/tsconfig.json` (include `tidy`, `vitest.config.ts`)
- Create: `tests/e2e/vitest.config.ts` (`include: ['tidy/**/*.test.ts']`, `fileParallelism: false`; Vitest must never pick up `journeys/*.spec.ts`)
- Test: `tests/e2e/tidy/names.test.ts`

**Interfaces — Produces:**
```ts
export const JOURNEY_NAMES = ['Window Tome', 'Cabinet Tome', 'Stonesong', 'Risky Tome', 'Popular Tome',
  'Loyal', 'Rattling in the stacks', 'Takings Tome', 'Spender', 'Fizzwick', 'Sale Tome', 'Buyer',
  'Scarce Tome', 'Latecomer', 'Gone Tome', 'Restock Tome', 'Chewed Tome', 'Crumbs everywhere',
  'Fixed Price Tome', 'Hopeful'] as const;
export type JourneyName = (typeof JOURNEY_NAMES)[number];
export function unique(name: JourneyName): string;            // body unchanged
export const JOURNEY_ROW_PATTERN: string;                     // works in JS RegExp and Postgres `~`
export function isJourneyRow(text: string): boolean;          // new RegExp(JOURNEY_ROW_PATTERN).test
```
`JOURNEY_ROW_PATTERN` = `^(<names, regex-escaped, joined by |>) [0-9a-z]{9,}$`, built from `JOURNEY_NAMES` and a `SUFFIX_PATTERN` constant declared next to `unique()` (today's suffix is 8 base-36 time chars + 1-2 random chars). All 20 existing call sites (including both incident texts) already use listed names, so none change.

- [ ] **Step 1: Write failing tests** in `names.test.ts`: for every `name` of `JOURNEY_NAMES`, `isJourneyRow(unique(name))` is true and `isJourneyRow(name)`, `isJourneyRow(name + ' of Doom')`, `isJourneyRow('x ' + unique(name))` are false; `isJourneyRow('Loyal Grusha')` is false.
- [ ] **Step 2: Run** `npm test -w @griffin/e2e-tests` — FAIL (exports missing).
- [ ] **Step 3: Implement** in `shop.ts` as above. Keep `shop.ts` importable from Vitest (it only imports `expect`/types from `@playwright/test`; call nothing at module load).
- [ ] **Step 4: Run** `npm test -w @griffin/e2e-tests` and `npm run typecheck -w @griffin/e2e-tests` — PASS.

Test-first: yes — `isJourneyRow` does not exist; the per-name test over `JOURNEY_NAMES` fails.

### Task 2: The four removal steps and the table-coverage check

**Files:**
- Create: `tests/e2e/tidy/remove.ts`
- Test: `tests/e2e/tidy/remove.test.ts` (runs against `TEST_DATABASE_URL` from `@griffin/shared`)

**Interfaces:**
- Consumes: `JOURNEY_ROW_PATTERN`, `unique` (Task 1).
- Produces:
```ts
export interface RemovalCounts { sales: number; incidents: number; tomes: number; patrons: number }
export function removeJourneyRows(client: pg.ClientBase): Promise<RemovalCounts>;
export const HANDLED_TABLES: readonly string[];        // 'catalog.tomes', 'catalog.stock_adjustments' (cascade), 'patrons.patrons', 'patrons.sales', 'incidents.incidents'
export const NO_JOURNEY_DATA_TABLES: readonly string[]; // 'incidents.wards', 'auth.staff', '<each schema>.schema_migrations'
```
`removeJourneyRows` runs `BEGIN`, then, with `$1 = JOURNEY_ROW_PATTERN` and schema-qualified names, in this order: (1) `patrons.sales` where `tome_id` is a matching `catalog.tomes` id, or `tome_title ~ $1`, or `patron_id` is a matching `patrons.patrons` id; (2) `incidents.incidents` where `tome_id` is a matching tome id, `tome_title ~ $1`, or `description ~ $1`; (3) `catalog.tomes` where `title ~ $1`; (4) `patrons.patrons` where `name ~ $1`; `COMMIT`. Any error: `ROLLBACK`, rethrow.

- [ ] **Step 1: Write failing tests.** `beforeAll`: `migrate()` each schema (`catalog`, `patrons`, `incidents`, `auth`) from `services/{catalog,patrons,incidents,gateway}/migrations` via `createPool`/`migrate` from `@griffin/shared`. Tests:
  - *removes journey rows and what hangs off them*: insert a `unique('Sale Tome')` tome with a stock adjustment, a `unique('Buyer')` patron with a sale of that tome, a sale of that tome to a seeded demo patron, an incident `unique('Crumbs everywhere')`; after `removeJourneyRows`, all are gone and the demo patron remains.
  - *keeps lookalikes*: tome `'Sale Tome'`, patron `'Buyer Brightwater'`, incident `'Crumbs everywhere'` (no suffix) are unchanged.
  - *a failure removes nothing*: a client whose 3rd `query` rejects leaves the inserted rows in place.
  - *table coverage (AC9)*: every `table_schema.table_name` from `information_schema.tables` (`BASE TABLE`, the four schemas) is in `HANDLED_TABLES` ∪ `NO_JOURNEY_DATA_TABLES`; the failure message names the unlisted table and says it needs a tidy-up step or a no-journey-data entry.
  - `afterEach` deletes the lookalike rows it inserted; nothing else in `griffin_test` is altered.
- [ ] **Step 2: Run** `npm run db:up && npm test -w @griffin/e2e-tests` — FAIL.
- [ ] **Step 3: Implement** `remove.ts`.
- [ ] **Step 4: Run** the same — PASS.

Test-first: yes — `removeJourneyRows` is missing; the removal, lookalike, rollback and coverage tests fail.

### Task 3: The guard, `runTidyUp`, and the Playwright hooks

**Files:**
- Create: `tests/e2e/tidy/tidy.ts`, `tests/e2e/tidy/global-setup.ts`, `tests/e2e/tidy/global-teardown.ts`
- Modify: `tests/e2e/playwright.config.ts:8-20` (add `globalSetup`, `globalTeardown`; update the header comment)
- Test: `tests/e2e/tidy/tidy.test.ts`

**Interfaces:**
- Consumes: `removeJourneyRows` (Task 2).
- Produces:
```ts
export type TidyDecision = { run: true; databaseUrl: string; host: string } | { run: false; message: string };
export function decideTidy(env: NodeJS.ProcessEnv): TidyDecision;
export function runTidyUp(when: 'start' | 'end', env?: NodeJS.ProcessEnv, log?: (line: string) => void): Promise<void>;
```
`decideTidy`: `E2E_KEEP_DATA === '1'` → skip; parse `E2E_BASE_URL ?? 'http://localhost:8080'` and `E2E_DATABASE_URL ?? DEV_DATABASE_URL` with `new URL`; an unparseable value or a hostname not exactly `localhost`/`127.0.0.1` → skip, naming the host only. `runTidyUp` never rejects: `new pg.Client({ connectionString, connectionTimeoutMillis: 3000, statement_timeout: 5000, query_timeout: 5000 })`, one connection, calls `removeJourneyRows`, logs one line with the counts; on any error logs one warning line naming the host and `error.message`, then `client.end()` in `finally`. Each hook file is `export default () => runTidyUp('start' | 'end')`. Lines are in the shop's light tone, e.g. "Tidy-up skipped: E2E_KEEP_DATA=1 keeps the journeys' tomes and patrons for you to inspect."

- [ ] **Step 1: Write failing tests**: `decideTidy` skips for `E2E_KEEP_DATA=1`; for base URL `https://griffin.onrender.com`, `http://localhost.example.com:8080`, `not a url`; for database `postgres://u:secret@db.example.com/griffin` (message contains `db.example.com`, not `secret`); runs for defaults and for `127.0.0.1`; ignores `DATABASE_URL=postgres://u:p@far.example.com/x`. `runTidyUp('end', { E2E_DATABASE_URL: 'postgres://griffin:griffin@localhost:1/griffin' }, log)` resolves and logs exactly one warning containing `localhost` and no password.
- [ ] **Step 2: Run** `npm test -w @griffin/e2e-tests` — FAIL.
- [ ] **Step 3: Implement** `tidy.ts`, the two hook files and the config entries.
- [ ] **Step 4: Run** `npm test -w @griffin/e2e-tests` and `npm run typecheck -w @griffin/e2e-tests` — PASS.

Test-first: yes — `decideTidy`/`runTidyUp` do not exist; the skip, host-only-message and unreachable-database tests fail.

### Task 4: Describe the new behaviour in the testing docs

**Files:** Modify `docs/testing.md:48-66` and `.ai-run/guides/testing/testing-patterns.md:136`.

- [ ] **Step 1:** Replace "do not tidy up after themselves" with plain-language text covering every AC7 point: tidy at start and end by default; `E2E_KEEP_DATA=1` to keep a failed journey's rows to inspect; local shop only (exactly localhost or 127.0.0.1, so a Codespace's forwarded address gets no tidy-up); `npm run dev` with your own database address → set `E2E_DATABASE_URL` to the same value; one run at a time against a shop; a new journey name goes in `JOURNEY_NAMES`; a new table pointing at a tome, patron, sale or incident needs a step in `tests/e2e/tidy/remove.ts` (the coverage test will say so). Mention `npm test` now also runs `tests/e2e/tidy` tests against `griffin_test`. Keep `docker compose down -v` as the full reset.

Test-first: no — documentation only.

---

negative-constraints:
- No delete routes / service, gateway, portal or migration changes: every task touches only `tests/e2e` and docs.
- No cleanup against a remote shop: Task 3 `decideTidy` (both hosts checked exactly).
- `DATABASE_URL` never read: Task 3, with a test.
- No full reset or reseed of `griffin`: Task 2 deletes matching rows only.
- No change to how service/integration tests handle their data or to `griffin_test`'s schema: Task 2 only runs the existing idempotent migrations and removes the rows its own tests insert.
- No CI job change: no task edits `.github/workflows/ci.yml`.
- Message never prints the connection string: Task 3 test.
- Backlog item 7: untouched.
