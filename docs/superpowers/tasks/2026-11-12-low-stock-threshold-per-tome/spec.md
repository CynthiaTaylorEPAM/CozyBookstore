# Spec: Low-stock threshold per tome (issue #8, backlog item 1)

## Why

Mirabel (owner, `docs/personas.md`) says: "Some tomes I want to reorder at five copies, others at one." Today the counter's Running Low panel uses one fixed level of 2 for every tome (`apps/portal/src/pages/Dashboard.tsx:8,19`), so her real reorder points live "in her head and on scraps of paper" (`docs/personas.md:46`). Pip (clerk) also uses the counter, so Pip sees the panel too.

## What

Each tome gets a **reorder level**: a whole number of copies, 0 or more. It is stored with the tome in the catalog. The Running Low panel lists a tome when its copies are at or below its own reorder level.

- **Storage.** A new numbered migration in `services/catalog/migrations/` adds the level to `tomes`, defaulting to 2, and does not allow negatives (same pattern as `stock`, `001_create_tomes.sql:7-8`). Existing tomes therefore start at 2, and the panel looks exactly as it does today.
- **API.** Staff tome responses (`GET /tomes`, `GET /tomes/:id`, POST/PATCH results, stock-adjustment results) include `reorderLevel`. `POST /tomes` accepts it as optional (default 2). `PATCH /tomes/:id` can change it. Both routes stay owner-only. Validation follows `stock`: integer, min 0. The edit schema applies no defaults: a `PATCH` that leaves out `reorderLevel` (or any other field) leaves it unchanged (today `tomeChanges` inherits `newTome`'s defaults, `services/catalog/src/app.ts:18-30`).
- **Running-low rule.** The catalog computes `runningLow` (true when `stock <= reorder_level`) in the staff tome columns, so the at-or-below rule lives in one place, on the server, where it can be tested.
- **Public route.** `GET /public/tomes` does **not** include `reorderLevel` or `runningLow`. That route gets its own column list instead of the shared `TOME_COLUMNS` (`services/catalog/src/app.ts:13-14,52-57`).
- **Portal.** `Tome` in `apps/portal/src/types.ts` gains `reorderLevel` and `runningLow`. The owner's add/edit dialog (`TomeDialog`, `apps/portal/src/pages/Tomes.tsx`) gets a "reorder at" field. The Running Low panel keeps `useLoad('/tomes')` (`Dashboard.tsx:13`), lists the tomes whose `runningLow` is true, and shows each line as, e.g., "2 left, reorder at 5" ("None left, reorder at 1" when empty), for both roles. The `LOW_STOCK` constant (`Dashboard.tsx:8`) is removed. Wording goes through `src/lore.ts` if the panel's existing text lives there.
- **Docs.** `docs/api.md` (catalog routes), the `tomes` ER diagram in `docs/architecture.md`, and Mirabel's frustration at `docs/personas.md:46` are updated.

## Acceptance criteria

1. Existing and newly added tomes without a given level have reorder level 2.
2. The owner can set the reorder level when adding a tome and change it when editing one. Values below 0 or that are not whole numbers are rejected with 400. A PATCH that does not include `reorderLevel` leaves it unchanged.
3. A clerk who tries to add a tome or change a tome's reorder level is refused (403).
4. Staff tome responses include `reorderLevel` and `runningLow`. `/public/tomes` responses include neither.
5. A tome is running low exactly when its copies are at or below its own reorder level, and the Running Low panel lists exactly those tomes. A tome at level 0 is running low only when no copies are left.
6. Each panel line shows copies left and the tome's reorder level. Owner and clerk see the same panel.
7. The reorder-level field appears in the owner's add/edit dialog only. Clerks never see the dialog, as today.
8. Catalog tests cover criteria 1–5 with both roles; criterion 5 is checked through `runningLow` at levels 0, 1 and 5 with stock below, at and above the level. The reprice test also asserts that `reorderLevel`, `featured` and `description` are kept. `npm test`, `lint`, `typecheck` and `build` pass.
9. `docs/api.md`, `docs/architecture.md` and `docs/personas.md` reflect the change.

## Non-goals

- Clerks setting or changing reorder levels.
- Any reorder action: purchase orders, supplier contact, alerts or notifications (backlog 12 is separate).
- Changing how stock itself changes. It still moves only through stock adjustments (`docs/architecture.md:525`).
- Showing the reorder level on the tomes list table or the public landing page.
- Changes to the gateway, shared package, patrons or incidents services (`TomeSummary` stays as is).
- Sorting, limiting or otherwise changing the panel beyond the threshold and the extra text.
- Adding a React test harness for the portal.

## Decisions

- A reorder level stored per tome in the catalog, over keeping a threshold in the portal (where the level lives).
- Every tome always has a whole-number level of 0 or more, over an optional level that falls back to 2 (whether a tome can lack a level).
- Existing tomes start at reorder level 2, over seeding varied demo levels or starting at 0 (the starting level for existing tomes) — user
- At or below the level counts as low, over strictly below (what "reorder at five" means at exactly five) — user
- Only the owner sets the level, in the add/edit dialog, over letting clerks set it too (who sets it) — user
- Everyone sees the level on the Running Low panel, over keeping it owner-only (who sees it) — user
- Keep the level off `/public/tomes` with a separate column list, over letting it appear publicly (public exposure) — user
- The catalog computes `runningLow` in staff tome responses, over the portal filtering with `stock <= reorderLevel` (where the running-low rule lives).
- The edit schema applies no defaults to any field, over exempting only `reorderLevel` (how a partial PATCH treats fields it leaves out).

## Assumptions

- No upper limit on the level beyond being a whole number of 0 or more. The builder may cap it if the form needs one.
