# Low-stock threshold per tome: Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task by task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Each tome carries its own reorder level, and the counter's Running Low panel uses it instead of the fixed 2.

**Architecture:** The catalog stores `reorder_level` and computes `runningLow` in the staff tome columns only. The portal reads both from `GET /tomes`, so the at-or-below rule lives once, on the server.

**Tech Stack:** Fastify, zod 4, Postgres, Vitest (`app.inject`), React + Vite.

**Spec:** `docs/superpowers/tasks/2026-11-12-low-stock-threshold-per-tome/spec.md`

Commit per task using the repository's existing convention.

**Release note:** on Render, deploy `griffin-catalog` before `gilded-griffin`. A portal running against an unmigrated catalog shows "Every shelf is comfortably full." until the catalog catches up. Docker and Codespaces are not affected.

## Global Constraints

- Reorder level: whole number, 0 or more, default 2 in both the DB and the API. Running low means `stock <= reorder_level`.
- Only the owner adds or edits tomes (`ownerOnly`). Clerks cannot set the level.
- `/public/tomes` never returns `reorderLevel` or `runningLow`.
- Stock still changes only through `/stock-adjustments`. `tomeChanges` keeps omitting `stock`.
- Out of scope: gateway, `packages/shared`, patrons, incidents (`TomeSummary` unchanged); the level on the tomes table or landing page; sorting or limiting the panel; a React test harness; any reorder action or alert.

## Review Focus

- A PATCH carrying only `priceCp` must keep `reorderLevel`, `featured` and `description` (zod 4 applies defaults inside `.partial()`). Covered in Task 1.
- `reorderLevel: 0` must save and read back as 0. A `||` slip in place of `?? null` would lose it. Covered in Task 1.
- `reorderLevel: 3000000000` must give 400, not a Postgres 500. Covered in Task 1.
- Level 0 with stock 0 is running low; level 0 with stock 1 is not. Covered in Task 1.
- A clerk PATCH of `reorderLevel` must give 403 (no such test exists today). Covered in Task 1.

---

### Task 1: Catalog stores the reorder level and computes `runningLow`

**Files:**
- Create: `services/catalog/migrations/003_add_tome_reorder_level.sql`
- Modify: `services/catalog/src/app.ts:12-14` (column lists), `:18-30` (schemas), `:52-57` (public route), `:80-128` (INSERT/UPDATE)
- Test: `services/catalog/test/catalog.test.ts`
- Docs: `docs/api.md:19-27`, the `tomes` ER diagram in `docs/architecture.md` (~l.220-232)

**Interfaces:**
- Produces: every staff tome response (list, get, POST, PATCH, stock adjustment) gains `reorderLevel: number` and `runningLow: boolean`. POST and PATCH accept an optional `reorderLevel`.

Test-first: yes — a new catalog test expecting `reorderLevel: 2` and `runningLow` on `GET /tomes/1` fails because the column does not exist.

- [ ] **Step 1: Write failing tests** in `catalog.test.ts`:
  - `GET /tomes` (clerk): every seeded tome has `reorderLevel: 2`. A POST without the level returns `reorderLevel: 2`.
  - POST with `reorderLevel: 5` (owner) returns 5. POST with `-1`, `1.5` or `3000000000` returns 400.
  - PATCH `{ reorderLevel: 0 }` (owner): the response and a follow-up `GET /tomes/1` both show 0.
  - Clerk PATCH `{ reorderLevel: 5 }` returns 403.
  - Extend the reprice test: first PATCH tome 1 with `{ reorderLevel: 5, description: 'Scones' }`, then PATCH `{ priceCp: 1200 }`, and expect `reorderLevel: 5, featured: true, description: 'Scones'`.
  - `runningLow` table: set a level with PATCH and the stock with `stock-adjustments` (or a direct `UPDATE` in setup). For levels 0, 1 and 5, check stock below, at and above the level, e.g. level 0 / stock 0 → true, level 0 / stock 1 → false, level 5 / stock 5 → true, level 5 / stock 6 → false. Use `it.each`.
  - `/public/tomes`: the response objects have no `reorderLevel` or `runningLow` key.
- [ ] **Step 2: Run** `npm test -w services/catalog` (needs `npm run db:up`). Expected: the new tests FAIL.
- [ ] **Step 3: Migration** `003_add_tome_reorder_level.sql`: `ALTER TABLE tomes ADD COLUMN reorder_level INTEGER NOT NULL DEFAULT 2 CHECK (reorder_level >= 0);`
- [ ] **Step 4: Column lists.** Rename today's list to `PUBLIC_TOME_COLUMNS`, use it in `/public/tomes`, and add a comment saying staff-only fields go only in the staff list:

```ts
const TOME_COLUMNS = `${PUBLIC_TOME_COLUMNS}, reorder_level AS "reorderLevel",
  stock <= reorder_level AS "runningLow"`;
```

- [ ] **Step 5: Schemas.** Define the fields once with no defaults (`tomeFields`). Build `newTome` from it, adding today's defaults plus `reorderLevel: z.number().int().min(0).max(2147483647).default(2)`. Build `tomeChanges` from the default-free fields: `.omit({ stock: true }).partial()`. That way a PATCH never fills in a field it left out.
- [ ] **Step 6: SQL.** Add `reorder_level` as `$10` to the POST INSERT, and add `reorder_level = COALESCE($10, reorder_level)` to the PATCH with `changes.reorderLevel ?? null`.
- [ ] **Step 7: Run** `npm test -w services/catalog`. Expected: PASS.
- [ ] **Step 8: Docs.** In `docs/api.md`, note `reorderLevel` (optional on POST and PATCH, default 2, owner only) and `runningLow` on staff tome responses, and say both stay off `/public/tomes`. Add `reorder_level` to the `tomes` ER diagram in `docs/architecture.md`.

### Task 2: Portal uses each tome's level

**Files:**
- Modify: `apps/portal/src/types.ts:13-24`, `apps/portal/src/pages/Dashboard.tsx:8,19,85-102`, `apps/portal/src/pages/Tomes.tsx:196-279` (`TomeDialog`), `docs/personas.md:46`

**Interfaces:**
- Consumes: `reorderLevel` and `runningLow` from Task 1.

Test-first: no — the portal has no React test harness (a spec non-goal), and the rule is tested in the catalog (Task 1).

- [ ] **Step 1: Make the change.**
  - `Tome` gains `reorderLevel: number; runningLow: boolean`.
  - `Dashboard.tsx`: delete `LOW_STOCK`, filter on `tome.runningLow`, and render each line as "N left, reorder at L" ("None left, reorder at L" at 0). The text stays inline (it is not in `lore.ts`), and both roles see it.
  - `TomeDialog`: add a "Reorder at" number input (`min={0}`, step 1) to the form state. It starts at `tome?.reorderLevel ?? 2`, with a comment that 2 mirrors the catalog's default. Send it on both add and edit.
  - `docs/personas.md:46`: record that Mirabel's reorder points now live on each tome, not in her head.

## Negative-constraint check

- Clerks cannot set the level: Task 1 keeps `ownerOnly` and adds a 403 test. Task 2 adds the field only to the owner dialog.
- No reorder action or alerts: no task adds one.
- Stock changes only through adjustments: Task 1 keeps `stock` out of `tomeChanges`.
- Level not on the tomes table or landing page: Task 2 changes only the dialog and the panel. Task 1 keeps both fields off the public list.
- No gateway, shared, patrons or incidents change: no task touches them.
- No panel sorting or limiting: Task 2 changes only the filter and the line text.
- No React harness: Task 2 is Test-first: no.
