# Issue #37: "Peek in the shop window" goes nowhere — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the hero button and the "Shop window" nav link reach `<section id="window">` by renaming the shop-front SVG's gradient ids so they no longer clash with page ids.

**Architecture:** Portal presentation layer only. Rename the three `<defs>` ids in `ShopFront.tsx` to `shopfront-*` and update every `url(#...)`; the landing page is untouched. A jsdom screen test enforces id uniqueness and reference integrity; a Playwright step proves the visible scroll.

**Tech Stack:** React + Vite, Vitest + Testing Library (jsdom), Playwright.

**Spec:** `docs/superpowers/tasks/2026-11-13-defect-fix-issue-37/spec.md` (analysis: `technical-analysis.md` in the same folder).

Commit per task using the repository's existing convention.

## Global Constraints

- New ids exactly: `shopfront-window`, `shopfront-halo`, `shopfront-wall`.
- Landing keeps `id="window"` (`Landing.tsx:107`) and both `href="#window"` (`:53`, `:76`); page address `/#window` unchanged.
- Do not touch `trailer/trailer.js`, `lore.ts`, page wording, services, gateway or API.
- Do not change the axe scan's `impact === 'critical'` filter in `visitor.spec.ts`.
- Plain `<a href="#id">` anchors only: no `scrollIntoView`, no `useId`.

## Review Focus

- A missed `url(#...)` rename leaves a window/lamp without its glow while jsdom draws nothing — pinned by Task 1's "every url(#x) resolves" assertion.
- A later section or SVG reusing an id silently kills a nav link — pinned by Task 1's "no duplicate ids" and "every href=#x resolves to exactly one element" assertions (also covers AC5: `#top`, `#folk`, `#wards`, `#visit`).
- Smooth scrolling (`theme.css:21`) makes an immediate viewport check flaky — Task 2 uses retrying `toBeInViewport`, never a fixed wait.

---

### Task 1: Prefix the shop-front gradient ids, with a page-integrity screen test

**Files:**
- Modify: `apps/portal/src/components/ShopFront.tsx:29-41` (defs), `:44,65,73,74,78,79,94,96` (`url(#...)` uses)
- Test: `apps/portal/src/pages/Landing.test.tsx` (add one `it` inside `describe('the shop front')`)

**Interfaces:** Produces the ids `shopfront-window`, `shopfront-halo`, `shopfront-wall`; nothing else consumes them.

Test-first: yes — "every in-page link reaches exactly one element and ids are unique" fails today because `id="window"` appears twice (SVG gradient and section).

- [ ] **Step 1: Write the failing test** (scope the AR-1 rule over the rendered landing page; keeps spec AC6's checks)

```tsx
it('gives every in-page link exactly one place to land', async () => {
  openPortal('/', null, pretendApi(shopAnswers()));
  await screen.findByRole('heading', { name: 'Dragons at Tea' });

  const ids = [...document.querySelectorAll('[id]')].map((el) => el.id);
  expect(ids.filter((id, i) => ids.indexOf(id) !== i)).toEqual([]);

  const targets = [...document.querySelectorAll('a[href^="#"]')].map((a) => a.getAttribute('href')!.slice(1));
  for (const id of targets) expect(document.querySelectorAll(`[id="${id}"]`)).toHaveLength(1);

  const fills = [...document.querySelectorAll('svg *')].flatMap((el) =>
    [...el.attributes].map((attr) => /url\(#([^)]+)\)/.exec(attr.value)?.[1]).filter(Boolean));
  expect(fills.length).toBeGreaterThan(0);
  for (const id of fills) expect(document.getElementById(id!)).not.toBeNull();

  expect(screen.getByRole('link', { name: /Peek in the shop window/ })).toHaveAttribute('href', '#window');
  expect(screen.getByRole('link', { name: 'Shop window' })).toHaveAttribute('href', '#window');
  const windowSection = document.querySelector('[id="window"]')!;
  expect(windowSection.tagName).toBe('SECTION');
  expect(within(windowSection as HTMLElement).getByRole('heading', { name: /favourites/i })).toBeVisible();
});
```

Adjust the two link-name matchers and the heading matcher to the exact rendered text if they differ; keep the assertions.

- [ ] **Step 2: Run it and see it fail**
Run: `npm test -w apps/portal -- Landing` — Expected: FAIL, duplicates list contains `window`.

- [ ] **Step 3: Rename in `ShopFront.tsx`**
`window`→`shopfront-window` (def `:33`, uses `:74,:79,:94`), `halo`→`shopfront-halo` (def `:29`, uses `:44,:73,:78,:96`), `wall`→`shopfront-wall` (def `:37`, use `:65`). Afterwards `grep -n 'url(#' ShopFront.tsx` shows only `shopfront-` names. Add a one-line comment above `<defs>`: the ids carry a `shopfront-` prefix because this inline SVG shares the page's id namespace with the landing sections (plan note STR-1).

- [ ] **Step 4: Run it and see it pass**
Run: `npm test -w apps/portal -- Landing` — Expected: all Landing tests PASS.

### Task 2: Visitor journey clicks "Peek in the shop window"

**Files:**
- Modify: `tests/e2e/journeys/visitor.spec.ts:6-29` (the "sees the shop window" test)
- Modify: `docs/testing.md:115` (visitor row)

Test-first: no — browser regression guard for a fix Task 1 already makes; it is the test itself.

- [ ] **Step 1:** After the existing shop-window assertions (after `:17`), click `page.getByRole('link', { name: /Peek in the shop window/ })` and assert `await expect(page.locator('section#window')).toBeInViewport()` (auto-retrying, absorbs smooth scroll; no `waitForTimeout`). Do not touch the axe test at `:55-62`. In `docs/testing.md:115` change the visitor row to start "Sees the shop window, reaches it from the hero's "Peek in the shop window" button, ...". Run against `docker compose up --build` with `npm run test:e2e -- visitor --repeat-each=3`; expected: all PASS.

---

negative-constraints:
- Trailer copy unchanged — honored by Global Constraints; no task touches `trailer/trailer.js`.
- Axe threshold unchanged — Task 2 explicitly leaves `:55-62` alone.
- Landing ids, link targets, `/#window` unchanged — Task 1 edits only `ShopFront.tsx`; Task 1 test asserts `href="#window"`.
- No wording/lore/data/services/gateway/API change — neither task touches them (the docs/testing.md edit is test documentation, not page wording).
- No scripted scrolling, no `useId` — Task 1 uses hand-written prefixed ids; Task 2 uses a plain click on the anchor.
