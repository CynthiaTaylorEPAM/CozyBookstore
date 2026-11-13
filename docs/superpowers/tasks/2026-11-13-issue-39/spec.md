# Spec: browser journeys tidy up after themselves (Issue #39)

## Why

After the Issue 37 check ("Peek in the Window"), the test books, patrons, sales and incidents the browser journeys create stay in the shop's own database (`griffin`). Two featured "Window Tome …" books are added on every run and show up in the public shop window on the landing page (`services/catalog/src/app.ts:69-74`). A presenter running the journeys before a demo is left with a cluttered shop. The only reset today is `docker compose down -v`, which also throws away any demo edits made by hand (`docs/testing.md:66`).

Who it is for: whoever runs `npm run test:e2e` against their local shop before showing it, which is the offsite's facilitators and attendees (`docs/purpose.md`). `docs/personas.md` has no persona for them. Affected: Aldric, who sees the public shop window, and Mirabel and Pip, who see the staff lists (`docs/personas.md`).

## What changes

A tidy-up step runs at the **start** and at the **end** of every `npm run test:e2e` run against a local shop. It connects straight to the local `griffin` database and removes everything the journeys created, plus everything attached to it. It leaves demo data and hand-made edits alone. No service, route or migration changes.

How test data is recognised: journeys already name every tome and patron they create with `unique(name)`, which gives "<name> <base-36 code>" (`tests/e2e/journeys/shop.ts:23-25`). `shop.ts` owns the list of journey names (`JOURNEY_NAMES`), and `unique()` accepts only a name from that list, so the typecheck rejects an unregistered name. The matcher the tidy-up uses is built in `shop.ts` from the same list and the same suffix format, and it accepts today's format. The tidy-up only imports the matcher. Every current `unique('<name>')` call already uses a name in the list (the known names are in `technical-analysis.md` §2, Purpose A), so no call site changes.

What is removed, in an order the database's links allow (sales point at patrons with no cascade; sales and incidents point at tomes across services with no link at all):
1. sales of a test tome or to a test patron;
2. incidents about a test tome, or whose text matches a test name;
3. test tomes (their stock adjustments go with them, `ON DELETE CASCADE`);
4. test patrons.

## Acceptance criteria

1. After any local run, the whole suite or a single journey file, the public shop window and the staff lists show no tome, patron, sale or incident created by the journeys.
2. Rows that are neither a journey's tome, patron or incident nor a sale or incident attached to one (demo seed data, hand-made edits) are unchanged after a run.
3. Test rows left by an earlier crashed or interrupted run, including those already in the database today, are gone once the next run starts.
4. With `E2E_KEEP_DATA=1`, neither tidy-up step runs, and the run says so in one line.
5. When `E2E_BASE_URL` points anywhere other than localhost or 127.0.0.1, or when the database address is not on localhost or 127.0.0.1, the tidy-up is skipped with a clear one-line message, and the journeys still run. The message names the host only, never the full connection string.
6. If the tidy-up cannot reach the database, takes longer than its limit or fails, the run prints a clear warning and the journeys' own pass or fail result is unchanged. A failure removes nothing.
7. `docs/testing.md` (around line 66) and `.ai-run/guides/testing/testing-patterns.md:136` describe the new behaviour in plain language:
   - tidy by default;
   - the opt-out, and what it is for (keeping a failed journey's rows to inspect);
   - local shop only: only localhost or 127.0.0.1 counts as local, so a Codespace's forwarded address gets no tidy-up;
   - someone who runs `npm run dev` with their own database address sets `E2E_DATABASE_URL` to the same value;
   - run the journeys one at a time against a shop;
   - a new journey name goes in `JOURNEY_NAMES`;
   - a new table that points at a tome, patron, sale or incident needs a step in the tidy-up.
8. A test shows that the tidy-up removes a matching row and keeps a lookalike that lacks the suffix. For every journey name, what `unique()` produces is matched.
9. A test lists every table in the catalog, patrons, incidents and auth schemas. It fails when a table is neither handled by the tidy-up nor marked as holding no journey data (wards, staff).

## Non-goals

- No delete routes or other changes to the shop's services, gateway or portal.
- No cleanup when running against a remote shop (`E2E_BASE_URL` not local).
- No change to how service or integration tests handle their own data, or to the `griffin_test` database.
- No full reset or reseed of the shop database.
- No change to the CI e2e job, which already runs `docker compose down -v`.
- Backlog item 7 (the bounty board) is not touched.

## Decisions

- Remove the journeys' rows and what is attached to them, over resetting the whole shop or only clearing the shop window — what "cleaned up" covers — user
- A direct-database tidy-up in the test layer, over new delete routes or a manual reset command — the mechanism — user
- Local shop only, skipped with a message for a remote `E2E_BASE_URL`, over supporting remote shops — remote shops — user
- Tidy up at the start and the end of each run, over only the end — when it runs, and clearing old leftovers — user
- Tidy by default with the `E2E_KEEP_DATA=1` opt-out, over making cleanup opt-in — reversing the `docs/testing.md:66` rule — user
- Leave `griffin_test` as it is, over emptying it too — service and integration test data — user
- One `JOURNEY_NAMES` list in `shop.ts`: `unique()` accepts only those names, and the tidy-up's matcher is built from the same list, over a separate hand-kept list and pattern — how test rows are recognised — user, answers AR-2
- Only localhost or 127.0.0.1 counts as local, so a Codespace's forwarded address gets no tidy-up, over also treating forwarded addresses as local — what counts as local — user
- Compare the hostnames parsed from `E2E_BASE_URL` and from the database address exactly against localhost or 127.0.0.1, over a separate on/off setting — how "remote" is detected (so `localhost.example.com` counts as remote)
- Warn and carry on when the tidy-up cannot finish, for any reason, over failing the run — so a tidy-up problem never hides a real test result: each hook catches its own errors, connecting and each statement have a limit of a few seconds, and the four steps run in one transaction on one connection
- Connect to `E2E_DATABASE_URL`, defaulting to `postgres://griffin:griffin@localhost:5432/griffin` (`packages/shared/src/config.ts:8`), over reading `DATABASE_URL` or copying `docker-compose.yml:15` — how the tidy-up finds the database (`DATABASE_URL` is never read)
- Keep the tidy-up's own removal steps and add a table-coverage test, over delete routes in each service — keeping the tidy-up in step with new tables
- State "one run at a time against a shop" in the docs, over an age filter on the start-of-run tidy-up — two runs on one shop at once

## Assumptions

- The journeys only sell, restock or report incidents on tomes and patrons they created themselves (they are designed not to touch demo data, per `shop.ts:19-22`). If one changes a demo tome's stock, that change is not reversed.
- Incident texts used by the journeys ("Rattling in the stacks", "Crumbs everywhere") can be matched the same way; the planner checks whether they go through `unique()`.

## Left to the planner

- Where the hook lives (Playwright global setup and teardown is the natural fit; none exists today).
- The database client used by `tests/e2e`.
- Where the tests for AC8 and AC9 run. `tests/e2e` has no unit-test runner, so keep the matcher a pure function and test it where `npm test` runs it, or add a runner there. The AC9 table check can run against `griffin_test`, which has the same schemas.
