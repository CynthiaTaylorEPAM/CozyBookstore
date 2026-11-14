# Purpose and context

Read this first. It explains why this repository exists, who it is for, and what that means for how it should be changed. The bookstore is the vehicle; the real subject is how software gets built.

## Why this repository exists

EPAM Canada has a mandate to become AI native. Part of that is developing and deploying SDLC **hyperfactories** (also called agentic factories): sets of AI agents that take a feature request through elaboration, planning, development, testing and deployment almost autonomously, with people directing and reviewing rather than doing each step by hand.

A hyperfactory needs an existing codebase to work on. This repository is that codebase for a leadership demonstration.

## The occasion

A leadership offsite in December 2026. All directors and above from delivery and account management will be walked through setting up and using a hyperfactory against this repository.

The session is run by the delivery manager who owns this repository.

### Shape of the session

1. **Teaser.** A trailer video of a little under five minutes plays at the offsite, ahead of the session. It tells Mirabel's story, sets a traditional bid beside EPAM's, and introduces the request to come. Its brief is in [story.md](story.md).
2. **Together.** The whole room builds the **bounty board** ([backlog](backlog.md) item 7) with the hyperfactory, as a guided walkthrough.
3. **On their own.** Attendees then choose their own feature requests and run the hyperfactory themselves.

## Two sets of goals

### Goals for the offsite (the real ones)

1. **Leaders see the whole lifecycle.** A feature request goes in; elaboration, a plan, code, tests and a deployment come out. Each stage should be visible and understandable.
2. **Leaders do it themselves.** They set up and use a hyperfactory, not just watch one.
3. **It feels like our work.** The system has the same basic parts as what EPAM Canada usually delivers (a database, microservices and APIs, a front-end portal), so the lesson transfers to client engagements.
4. **Nobody is left behind.** The audience has mixed backgrounds, and many are not hands-on technical. The domain, the documentation and the way of running the system must not assume engineering experience.
5. **It works on the day.** A demonstration that fails in front of leadership teaches the wrong lesson.

### Goals for the bookstore (the fictional ones)

The Gilded Griffin is a cozy bookstore in a fantasy realm. Its staff need to manage tomes and stock, serve patrons of many races, and deal with the monsters that occasionally beset the shop. These goals exist to give the hyperfactory believable feature requests. The list is in [backlog.md](backlog.md).

## Why a fantasy bookstore

- **Everyone understands a shop.** Stock, customers, sales and things going wrong need no explanation.
- **It maps onto real systems.** Tomes are a product catalog, patrons are customers, sales are orders, monster incidents are incident management with a cross-service effect on inventory.
- **Light whimsy keeps a mixed room engaged** without getting in the way. It lives in the wording and the demo data, never in the code structure.

## What this means for changes

These principles follow from the goals above. They apply to people and to agents.

| Principle | Because |
|---|---|
| Keep it a working skeleton with deliberate gaps | The gaps are the hyperfactory's raw material. Do not build backlog items unless that is the task in hand |
| Keep it small and readable | A director should be able to follow any one service in a few minutes. Prefer plain, explicit code to clever abstractions |
| Keep it representative | Database, microservices, gateway, portal, roles, tests, pipeline. Do not collapse the services into one for convenience |
| Keep it easy to run | One click in GitHub Codespaces or one command with Docker. A change that adds a setup step needs a very good reason |
| Keep `main` demonstrable | `main` should always start cleanly with demo data and pass CI |
| Keep the guardrails strong | Tests, lint, typecheck, `CLAUDE.md` and the docs are what let agents work safely. A feature is not done without them |
| Keep the landing page polished | It is the first thing the room sees |
| Write for a non-technical reader | In documentation, pull request descriptions and user-facing text, explain terms and avoid jargon |
| Keep the tone | Light whimsy in what users read; plain names in code |

## What a good demonstration feature looks like

When choosing or writing a feature request for the offsite:

- A shop owner could ask for it in one or two sentences.
- The result is visible in the portal, so the room can see it work.
- It touches more than one part of the system where possible, to show agents working across a database, a service and the front end.
- It has a business rule worth elaborating (who is allowed, what happens at the limits), so the elaboration and planning stages have something to do.
- It is small enough to finish within the session.

[backlog.md](backlog.md) is ordered from small to large with this in mind.

## Status

As of 12 November 2026:

- The initial codebase and the expanded architecture documentation are merged to `main`. CI passes.
- Running with Docker Compose has been verified end to end.
- The GitHub Codespaces configuration had one fix applied after a failed first attempt and has **not yet been confirmed working**.
- The Render blueprint (`render.yaml`) has **never been run**.
- No hyperfactory has been set up against the repository yet.

## Still to be decided

These are not recorded anywhere yet. Fill them in as they are settled.

- The exact date and length of the offsite session.
- Which hyperfactory tooling will be used, and how it is configured.
- Which backlog items attendees may choose from in the second part of the session, and which will be rehearsed beforehand.
- How attendees will run the system: each in their own Codespace, or one shared deployment.
- Whether attendees will have access to this repository, or work in copies of it.
