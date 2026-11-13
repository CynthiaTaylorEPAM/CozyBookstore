# Quality Gates

Gates for gilded-griffin, ordered fastest to slowest. `npm test`, `npm run lint`, `npm run typecheck` and `npm run build` must all pass before a change is done (`AGENTS.md:29`). CI runs them in the `check` job and the Docker image plus browser journeys in the `e2e` job (`.github/workflows/ci.yml:9-76`), on every pull request and every push to `main` (`.github/workflows/ci.yml:3-6`).

There is **no formatter** (no Prettier or similar config, no format script) and no pre-commit hook. Match the style of the surrounding file.

## Prerequisites

| Need | Command | Source |
|---|---|---|
| Dependencies | `npm ci` (CI) or `npm install` | `.github/workflows/ci.yml:32`, `README.md:68` |
| Postgres with `griffin_test` (for test gates) | `npm run db:up` | `package.json:24`, `docker/init-test-db.sql:3` |
| Node | 22 or later | `package.json:12-14` |

---

### Lint

- **Run**: `npm run lint` (runs `eslint .`)
- **Source**: `package.json:23`; CI `.github/workflows/ci.yml:33`
- **Pass**: exit 0, no errors
- **Fail**: any ESLint error from `js.configs.recommended` / `tseslint.configs.recommended` or the project rules (`eslint.config.mjs:7-15`)
- **Auto-fix**: `npx eslint . --fix` (not a project script)
- **Skip if**: never; `trailer/`, `dist/` and `node_modules/` are already ignored (`eslint.config.mjs:6`)

### Typecheck

- **Run**: `npm run typecheck`
- **Source**: `package.json:22` (builds `@griffin/shared` first, then `typecheck` in every workspace); CI `.github/workflows/ci.yml:34`
- **Pass**: exit 0
- **Fail**: any `tsc --noEmit` error under `strict` (`tsconfig.base.json:7`). Services also check their tests via `tsconfig.test.json` (`services/catalog/package.json:8`); `tests/e2e` and `tests/integration` typecheck too (`tests/e2e/package.json:7`, `tests/integration/package.json:7`)
- **Skip if**: never

### Dependency audit

- **Run**: `npm audit --audit-level=high`
- **Source**: CI only, `.github/workflows/ci.yml:41`
- **Pass**: no high or critical advisories
- **Fail**: a high-severity advisory in any dependency
- **Auto-fix**: `npm audit fix` (review the lockfile change)
- **Skip if**: no network access locally; CI still runs it

### Test

- **Run**: `npm test`
- **Source**: `package.json:19` (builds shared, then `vitest run` in every workspace with a `test` script: shared, four services, portal, `tests/integration`, and `tests/e2e`, which runs only the tidy-up tests in `tests/e2e/tidy` against `griffin_test`, never the journeys: `tests/e2e/package.json::test`, `tests/e2e/vitest.config.ts`)
- **Pass**: exit 0. `it.todo` entries are reported but do not fail (`services/patrons/test/patrons.test.ts:201`)
- **Fail**: any failing test; `ECONNREFUSED` on 5432 means Postgres is not up
- **Skip if**: never for a code change. Docs-only changes may skip
- **CI form**: CI does not call `npm test`; it runs the coverage gate below, then `npm test -w @griffin/integration-tests`, then `npm test -w @griffin/e2e-tests` for the journey tidy-up tests (`.github/workflows/ci.yml:36-39`). Together they cover the same tests

### Test with coverage

- **Run**: `npm run test:coverage`
- **Source**: `package.json:20`; CI `.github/workflows/ci.yml:36`
- **Pass**: all tests pass and line coverage meets the floors: shared 90% (`packages/shared/vitest.config.ts:6`), each service 85% (`services/catalog/vitest.config.ts:9`), portal 70% (`apps/portal/vite.config.ts:13`)
- **Fail**: a failing test or coverage below a floor
- **Skip if**: change adds no source code under `src/`

### Build

- **Run**: `npm run build`
- **Source**: `package.json:17` (shared, then catalog, patrons, incidents, gateway, portal; the portal runs `tsc` then `vite build`, `apps/portal/package.json:8`); CI `.github/workflows/ci.yml:40`
- **Pass**: exit 0, `dist/` produced in each workspace
- **Fail**: compile error or Vite build error
- **Skip if**: never

### Docker image build

- **Run**: `docker compose build`
- **Source**: `docker-compose.yml:12-13` (one `docker/Dockerfile`, built into a separate image per service: `docker-compose.yml:40`, `docker-compose.yml:49`, `docker-compose.yml:58`, `docker-compose.yml:67`). CI builds and starts it in the `e2e` job with `docker compose up -d --build --wait` (`.github/workflows/ci.yml:53`)
- **Pass**: all four images build (the Dockerfile runs `npm ci` and `npm run build`, `docker/Dockerfile:15-17`)
- **Fail**: build error, or a new workspace whose `package.json` is not copied in `docker/Dockerfile:7-14`
- **Skip if**: Docker is not available locally; CI still runs it

### Browser journeys (e2e), CI only

Not a required local gate (user decision, 2026-11-13): agents do not need it to call a change done. CI runs it on every pull request; run it locally only when asked, or when a change adds or alters a journey in `tests/e2e`.

- **Run**: start the shop with `docker compose up --build` (or `docker compose up -d --build --wait`), then `npm run test:e2e`
- **Source**: `package.json:21` (`playwright test` in `tests/e2e`, `tests/e2e/package.json::e2e`); CI `.github/workflows/ci.yml:53-64`
- **Prerequisite**: `npx playwright install chromium` once (`.github/workflows/ci.yml:63`); shop healthy at `http://localhost:8080/health` (`.github/workflows/ci.yml:57`)
- **Pass**: every journey in `tests/e2e/journeys` passes (CI allows 1 retry, `tests/e2e/playwright.config.ts::retries`)
- **Fail**: a failing journey; CI uploads `browser-test-report` (`.github/workflows/ci.yml:65-72`)
