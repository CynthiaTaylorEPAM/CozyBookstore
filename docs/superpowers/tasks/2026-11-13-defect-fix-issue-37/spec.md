# Spec: "Peek in the shop window" goes nowhere (issue #37)

## Who it is for

Visitors on the public landing page (`/`). They click "Peek in the shop window" in the hero, or "Shop window" in the top bar, to see this season's favourites. Right now nothing happens.

## What goes wrong today

Both links are plain in-page anchors to `#window` (`apps/portal/src/pages/Landing.tsx:53`, `:76`). The section they mean to reach is `<section id="window">` at `Landing.tsx:107`. The shop-front illustration is drawn earlier on the page (`Landing.tsx:95`), and it defines an SVG colour gradient that also has the id `window` (`apps/portal/src/components/ShopFront.tsx:33`). The browser jumps to the first element with that id. That element is the gradient, which is never drawn, so the page does not move. (Source: technical-analysis.md, section 2.)

The illustration's other two gradients, `halo` (`ShopFront.tsx:29`) and `wall` (`:37`), are global ids too. They do not clash with anything today, but they would clash the same way if a section with either name were added later.

## The fix

Give the illustration's three gradient ids names that belong to the illustration: `window` becomes `shopfront-window`, `halo` becomes `shopfront-halo`, and `wall` becomes `shopfront-wall`. Update every `url(#...)` reference inside `ShopFront.tsx` to match: `window` at `:74, :79, :94`, `halo` at `:44, :73, :78, :96`, and `wall` at `:65`. The landing page section keeps `id="window"`, and both links keep `href="#window"`, so the page address `/#window` stays the same.

## Acceptance criteria

1. Clicking "Peek in the shop window" on `/` brings the "This season's favourites" section into view.
2. Clicking "Shop window" in the top bar does the same.
3. The rendered landing page has exactly one element with `id="window"`, and it is the shop-window section.
4. The shop-front illustration looks the same as before. The attic window, the bay window and the door lamp keep their glow, and the halo and wall shading stay. No `url(#...)` in `ShopFront.tsx` points to an id that no longer exists.
5. The other landing links (`#top`, `#folk`, `#wards`, `#visit`) still reach their sections.
6. `Landing.test.tsx` gets a screen test showing that both links point to `#window`, that exactly one `window` element exists, and that it is the shop-window section. jsdom cannot scroll, so this test checks the page structure only.
7. `tests/e2e/journeys/visitor.spec.ts` gets a step that clicks "Peek in the shop window" and checks that the shop-window section is on screen.
8. `npm test`, `npm run lint`, `npm run typecheck` and `npm run build` pass.

## Non-goals

- No change to the trailer's separate copy of the illustration (`trailer/trailer.js`). It is a standalone SVG outside the portal's page.
- No change to the axe scan's threshold in the visitor journey. It still fails on critical problems only.
- No change to the landing page's ids, its link targets, or the page address `/#window`.
- No change to page wording, `lore.ts`, data, services, the gateway or the API.
- No switch from plain anchors to scripted scrolling. No auto-generated SVG ids (React `useId`).

## Decisions

- Rename the illustration's ids, not the landing section's id, so the page address `/#window` stays the same. This answers which side of the clash moves.
- Prefix all three illustration ids (`shopfront-window`, `shopfront-halo`, `shopfront-wall`) over renaming only the clashing one. This answers how far the fix reaches. — user
- Hand-written prefixed ids over ids generated at render time (`useId`). This answers how to make the ids unique, and it keeps the repo's existing pattern. — user
- A screen test plus a click step in the visitor browser journey, over a screen test alone or also tightening the axe scan. This answers how the fix is proven to stay fixed. — user
- Keep plain `href="#window"` anchors over a scripted scroll. This answers how in-page links navigate, and it follows the convention at `Landing.tsx:45-84`.

## Left to the builder

- How exactly to check "on screen" in Playwright (for example `toBeInViewport`). Smooth scrolling is on (`theme.css:21`), so the check should wait for the scroll to finish.
