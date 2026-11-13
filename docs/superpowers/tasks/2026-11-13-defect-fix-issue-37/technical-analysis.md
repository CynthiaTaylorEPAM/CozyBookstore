# Technical Research

**Task**: portal landing public-catalog
**Generated**: 2026-11-13
**Research path**: filesystem

---

## 1. Original Context

defect fix - Issue 37
GitHub issue #37 — "Defect: Clicking "Peek in the shop window" on the landing page does nothing"
Body: When I click on the "Peek in the shop window" button, nothing happens. (screenshot attached in the issue)

---

## 2. Codebase Findings

### Existing Implementations

**Purpose: a visitor clicks "Peek in the shop window" and is taken down the page to the shop window.**

- `apps/portal/src/pages/Landing.tsx:76-78` — the button is a plain anchor `<a href="#window" className="button button--gold button--large">`. No click handler; it relies on the browser's in-page fragment jump.
- `apps/portal/src/pages/Landing.tsx:53` — the top-nav link "Shop window" uses the same `href="#window"`. Same mechanism, same target.
- `apps/portal/src/pages/Landing.tsx:107` — the intended target: `<section className="section" id="window">` (the "This season's favourites" grid, fed by `GET /public/tomes`).
- `apps/portal/src/components/ShopFront.tsx:33` — **a second element with `id="window"`**: the SVG `<linearGradient id="window">` in the hero illustration's `<defs>`. `ShopFront` is rendered at `Landing.tsx:95`, *before* the section at line 107 in document order. The browser resolves `#window` to the first matching element, which is a non-rendered gradient definition, so there is nowhere to scroll to and nothing visibly happens. This is the observed defect.
  - Consumers of that gradient id inside the SVG: `fill="url(#window)"` at `ShopFront.tsx:74` (attic window), `:79` (bay window), `:94` (door lamp).
  - Sibling SVG ids in the same `<defs>`: `halo` (`:29`, used at `:44,73,78,96`) and `wall` (`:37`, used at `:65`). Neither currently clashes with a page id (`top`, `window`, `folk`, `wards`, `visit`).
- Other fragment links on the page, all working targets with unique ids: `#top` (`:45` → `:63`), `#folk` (`:54` → `:131`), `#wards` (`:55`, `:84` status pill → `:165`), `#visit` (`:56`, `:79` "Plan a visit" → `:219`).
- `apps/portal/src/styles/theme.css:21` — `html { scroll-behavior: smooth; }`: fragment jumps animate; no JS scroll code exists anywhere in `apps/portal/src` (searched `scrollIntoView`).

Other touched code: none. Routing is `BrowserRouter` (`apps/portal/src/main.tsx:20`), so a `#fragment` href does not hit React Router's route matching; `App.tsx:21` mounts `Landing` at `/`.

### Decisions Already in the Code

- In-page navigation is plain `<a href="#id">` anchors, not `Link` or JS scrolling (`Landing.tsx:45-84`). Alternative: `scrollIntoView` handlers. Reason: none found. This is the convention.
- SVG gradients are referenced by global document ids (`ShopFront.tsx:29-41`), not scoped/generated ids (e.g. React `useId`). Reason: none found. Since the SVG is inline in the page, its ids share the HTML document's id namespace.
- `ShopFront.tsx` has only one render site (`Landing.tsx:95`), so it appears once per page.

### Task Statements Checked Against the Code

- "Clicking 'Peek in the shop window' ... does nothing" — **holds**: `Landing.tsx:76` targets `#window`, and the first `id="window"` in the DOM is `ShopFront.tsx:33` (an SVG `<defs>` gradient that is never rendered), ahead of `Landing.tsx:107`.
- Not stated in the issue but implied by the code: the nav link "Shop window" (`Landing.tsx:53`) shares the target and so would fail the same way. Not checked in a browser here.

### Consumers of Changed Contracts

- The id `window` (gradient): `ShopFront.tsx:74,79,94` (`url(#window)`). Found by searching for `#window` across the repo, excluding node_modules.
- The id `window` (section): `Landing.tsx:53,76` (`href="#window"`). No tests, e2e journeys or docs reference the `#window` fragment or the `window` id.
- `trailer/trailer.js:73-96,344,395-396` also uses `url(#window)` / `url(#halo)`, but in its own standalone SVG ("redrawn" copy of ShopFront, per its comment at `:73`), not in the portal DOM. It does not import `ShopFront.tsx`.

### Architecture and Layers Affected

- Portal (React + Vite) presentation layer only: `pages/Landing.tsx` and/or `components/ShopFront.tsx`. No service, gateway, API, schema or auth involvement; the shop-window data (`/public/tomes`) loads and renders correctly (covered by tests).

### Integration Points

- None beyond the page. `Landing` loads `/public/tomes`, `/public/patron-stats`, `/public/shop-status` via `useLoad` (`Landing.tsx:33-35`); unaffected.

### Patterns and Conventions

- Display text in `lore.ts`; tone light whimsy (AGENTS.md). Fragment anchors for in-page links. Pure inline SVG illustrations with no image files (`ShopFront.tsx:1`).

---

## 3. Documentation Findings

### Guides and Architecture Docs

- `.ai-run/guides/testing/testing-patterns.md:19,126-128` — screen tests in `apps/portal/src/**/*.test.tsx` with jsdom and a pretend API; `:132-137` browser journeys in `tests/e2e`, the visitor journey includes an axe scan. `:161-162` a portal page change updates its `*.test.tsx`.
- `docs/story.md:182` — lists `ShopFront.tsx` as the established shop-front illustration.
- `docs/testing.md:115` — the visitor journey covers "sees the shop window" and an axe scan of the shop front.

### Architectural Decisions

- None recorded about in-page anchors or SVG id scoping. No NOTE/HACK markers in the two files.

### Derived Conventions

- One-page landing with section ids used as anchor targets; illustration ids are hand-written and global.

---

## 4. Testing Landscape

### Existing Coverage

- `apps/portal/src/pages/Landing.test.tsx` — 7 tests: public-only calls, shop-window content and prices, patron counts, wards pill, monsters warning, services down, staff-door link. None click "Peek in the shop window" or check any anchor `href`/target.
- `tests/e2e/journeys/visitor.spec.ts:6-29` — visitor sees the shop window via `page.goto('/')` and article lookups; no click on the hero button or nav links. `:55-62` axe scan of `/` filters to `impact === 'critical'` only.
- `apps/portal/src/App.test.tsx` — routing; not read in detail.

### Testing Framework and Patterns

- Vitest + Testing Library + jsdom (`apps/portal/vite.config.ts:8-10`); harness `openPortal(path, as, api)` and `pretendApi()` (`apps/portal/src/test/harness.tsx`), fixtures `shopAnswers()` (`apps/portal/src/test/fixtures.ts`). jsdom does no layout or scrolling, so a scroll cannot be observed there; DOM facts (an anchor's `href`, `document.getElementById`, `querySelectorAll('[id="window"]')`) can.
- Playwright + `@axe-core/playwright` for journeys (real Chromium, can observe scroll/viewport).
- Coverage floor for `apps/portal`: 70% (`vite.config.ts:13`).

### Coverage Gaps

- No test anywhere asserts that landing-page anchors reach their sections, or that ids on the page are unique.
- The axe scan only fails on `critical` violations; axe's `duplicate-id` rules are lower impact, which is how this passed.

---

## 5. Configuration and Environment

### Environment Variables

- None relevant.

### Configuration Files

- `apps/portal/vite.config.ts` — test environment and coverage floor. `apps/portal/src/styles/theme.css:21` — smooth scrolling.

### Feature Flags and Deployment Concerns

- None. Portal is built and served by the gateway (`docker compose up --build`); no config change involved.

---

## 6. Risk Indicators

- Root cause is an id collision between `ShopFront.tsx:33` (`<linearGradient id="window">`) and `Landing.tsx:107` (`<section id="window">`); the three `url(#window)` fills at `ShopFront.tsx:74,79,94` depend on the gradient id, so renaming one side must keep the other side's references in step or the bay-window glow disappears.
- The nav link `Landing.tsx:53` shares the broken target; a fix verified only on the hero button may leave it untested.
- `halo` and `wall` are also global ids in the same SVG; any future section named that way would collide the same way.
- Speculative: a jsdom screen test can only check DOM facts (unique id, href target exists and is the section); proving the visible scroll needs a Playwright check in `tests/e2e/journeys/visitor.spec.ts`.
- `trailer/trailer.js` keeps its own copy of the SVG with the same ids; it is separate and unaffected, but it diverges from `ShopFront.tsx` if only the portal is renamed.

---

## 7. Summary for Complexity Assessment

The defect is confined to the portal's presentation layer: two files, `apps/portal/src/pages/Landing.tsx` and `apps/portal/src/components/ShopFront.tsx`. The "Peek in the shop window" button (and the "Shop window" nav link) is a plain `href="#window"` anchor. The hero illustration rendered above it, `ShopFront`, defines an SVG gradient with the same id, `window`, earlier in the document. The browser jumps to that first match, a gradient definition that is never drawn, so nothing moves. No service, API, schema, auth, config or routing is involved.

There is nothing new technically. The page already uses fragment anchors that work for `#folk`, `#wards` and `#visit`. The only shared contract is the id itself: three `url(#window)` fills inside the same SVG and two anchors on the page.

On tests, `Landing.test.tsx` covers the page content well but never checks an anchor or id uniqueness. The e2e visitor journey loads `/` but never clicks the button, and its axe scan only fails on critical violations, so the duplicate id got through. jsdom cannot observe scrolling, so a regression check works at the DOM level in the screen test, plus optionally a click-and-in-view check in Playwright. Risk is low. The main traps are leaving one `url(#window)` reference behind, which would break the bay-window colour, and forgetting the nav link.

---

## 8. External References

None named by the task (the issue's attached screenshot is not in the repository).
