# Product Context

**Project**: The Gilded Griffin, management portal for a cozy fantasy bookstore in Emberhollow (`README.md:3`)
**Human sources**: `docs/purpose.md` (why), `docs/personas.md` (who), `docs/backlog.md` (what next), `docs/story.md` (the narrative)

---

## Why This Repository Exists

It is the example codebase for an EPAM Canada leadership offsite (December 2026) where directors and above from delivery and account management learn to set up and use an SDLC hyperfactory: agents taking a feature request through elaboration, planning, development, testing and deployment (`docs/purpose.md:7-13`, `AGENTS.md:7`). Many attendees are not hands-on technical (`docs/purpose.md:30`).

Session shape (`docs/purpose.md:19-21`):
1. A trailer under 3 minutes tells Mirabel's story.
2. The whole room builds the **bounty board** (backlog item 7) together.
3. Attendees pick their own feature requests and run the hyperfactory themselves.

The bookstore maps onto real systems: tomes are a product catalog, patrons are customers, sales are orders, monster incidents are incident management with a cross-service effect on inventory (`docs/purpose.md:40`).

---

## Hard Rule: Backlog Item 7 Is Reserved

The **bounty board** (backlog item 7) is reserved for the live session and must not land on `main` beforehand (`AGENTS.md:9`, `docs/backlog.md:18`). A rehearsal is allowed only on a separate branch that is never merged. Item 23 (public bounty notices) builds on item 7, so it waits too (`docs/backlog.md:50`).

| Avoid | Prefer |
|---|---|
| Building bounties, rewards or claims on incidents in any change aimed at `main` | Leave incidents without bounties; rehearse on a throwaway branch |
| "Preparing the ground" for item 7 with schema or API stubs | Nothing for item 7 on `main` until the session |

---

## Principles

From `docs/purpose.md:47-57` and `AGENTS.md:9-12`.

| Principle | What it means for a change |
|---|---|
| Small, readable, working skeleton | A director should follow any one service in a few minutes; plain explicit code over clever abstractions |
| Deliberate gaps | The gaps in `docs/backlog.md` are raw material for the hyperfactory. Build a backlog item only when that is the task |
| Representative | Keep database, separate services, gateway, portal, roles, tests and pipeline. Never collapse services for convenience |
| Easy to run | One click in GitHub Codespaces or one command, `docker compose up --build` (`README.md:13-27`). A new setup step needs a very good reason |
| `main` is demonstrable | `main` always starts cleanly with demo data and passes CI (`docs/purpose.md:53`) |
| Strong guardrails | Tests, lint, typecheck, `CLAUDE.md` and docs; a feature is not done without them (`docs/purpose.md:54`) |
| Polished landing page | It is the first thing the room sees (`docs/purpose.md:55`) |
| Tone | Light whimsy in what users read; plain names in code (`docs/purpose.md:41`, `docs/purpose.md:57`) |

---

## Writing for a Non-Technical Reader

Docs, pull request descriptions and user-facing text are written for a non-technical reader: explain terms, avoid jargon (`AGENTS.md:12`, `docs/purpose.md:56`).

| Avoid | Prefer |
|---|---|
| "Added nullable int col + COALESCE in PATCH handler" | "Editing one detail of a tome no longer resets the others" |
| "RBAC enforced at preHandler" | "Pip can see the level but cannot change it" |
| Describing screens and endpoints | Describing what a persona can now do in their day |

`docs/testing.md:3` is a model: "no testing experience is assumed".

---

## Personas

Every feature names who it is for and who else it affects, using `docs/personas.md` (`AGENTS.md:14`, `docs/personas.md:3`).

| Persona | Role | In the system today |
|---|---|---|
| Mirabel Thistlewick | Owner | Signs in as `owner` (`mirabel` / `griffin`) |
| Pip Underbough | Clerk | Signs in as `clerk` (`pip` / `quill`) |
| Sir Aldric Fenn | First-time visitor | Public landing page only |
| Grusha Ironjaw, Ilyana Moonwhisper, Kessandra Dune | Patrons | Records staff keep |
| Orsolya Brightscale | Local author | A patron record and an author name |
| Quillon Vance, Bran Holloway, Hesper Nightingale, Magister Edda Farrow | Supplier, adventurer, wardwright, auditor | Not represented yet |

Source: `docs/personas.md:9-23`, `README.md:35-38`.

Questions to ask of every feature (`docs/personas.md:341-345`):
- Who is this for, and what could they not do before?
- Who else does it touch?
- What does each role need to be allowed, and refused?
- How would the persona know it worked?

**Keep personas honest.** When a feature removes a frustration, update that persona's "uses today" and "what gets in their way" sections (`docs/personas.md:359`, `AGENTS.md:14`). Example: the per-tome reorder level updated Mirabel's frustration in the same pull request (PR #34).

Roles today: `owner`, `clerk`, anonymous visitor (`packages/shared/src/domain.ts:5`). New roles the backlog would need are listed at `docs/personas.md:349-357`.

---

## Backlog

`docs/backlog.md` is ordered small to large, each item naming the parts of the system it touches (`docs/backlog.md:3`). A good demonstration feature (`docs/purpose.md:61-67`):
- A shop owner could ask for it in one or two sentences.
- The result is visible in the portal.
- It touches more than one part of the system where possible.
- It has a business rule worth elaborating (who is allowed, what happens at the limits).
- It is small enough to finish within the session.

Item 1 (low-stock threshold per tome) has shipped (PR #34) but is still listed in `docs/backlog.md:9`. Item 14 (all-or-nothing sale) is a known gap recorded as `it.todo` in tests (`docs/testing.md:149`).

---

## Storytelling

For anything that tells the story (the trailer, slides, in-character feature requests), start from `docs/story.md` (`AGENTS.md:16`). It marks which parts are established in the codebase and which are only **proposed** (`docs/story.md:9`). The trailer is already made, in `trailer/` (`docs/story.md:7`); `trailer/` is not linted or tested (`eslint.config.mjs:5-6`).

---

## Status and Open Decisions

As of 12 November 2026 (`docs/purpose.md:73-79`): Docker Compose is verified end to end; Codespaces is not yet confirmed working; `render.yaml` has never been run. Open decisions (session date, tooling, which backlog items attendees may pick, how attendees run the system) are listed at `docs/purpose.md:83-89`.
