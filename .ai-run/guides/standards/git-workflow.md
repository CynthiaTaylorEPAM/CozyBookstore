# Git Workflow

Branching, commits, pull requests and merging for gilded-griffin. Hosted on GitHub (`CynthiaTaylorEPAM/...`); CI is `.github/workflows/ci.yml`, run on every pull request and every push to `main` (`.github/workflows/ci.yml:3-6`). Verified against `git log --oneline -20 origin/main` and `git log --merges -5 origin/main` on 2026-11-13.

---

## Branch Naming Convention

| Branch type | Pattern | Real example |
|---|---|---|
| Main | `main` | always demonstrable, never committed to directly |
| Feature (a backlog item or user-visible change) | `feature/<slug>` | `feature/low-stock-threshold-per-tome` (PR #34) |
| Housekeeping (docs, tooling, agent guides, config) | `chore/<slug>` | `chore/agent-guides` |

- `<slug>` is lowercase kebab-case, named after the feature in plain words, not a ticket number.
- Cut from an up-to-date `origin/main`.
- Older branches on the remote do not follow this: `testing-strategy` (PR #35, no prefix) and auto-named `claude/<adjective>-<name>-<id>` (PRs #5 to #7). Use the prefixes above for new work.
- A backlog item 7 (bounty board) rehearsal lives on its own branch and is never merged to `main` (`docs/backlog.md:18`, `AGENTS.md:9`).

---

## Commit Message Format

A single plain imperative English sentence, no ticket prefix and no conventional-commit type.

```
Give each tome its own reorder level and say when it is running low

Task 1 of low-stock-threshold-per-tome. The catalog stores reorder_level
(default 2, owner sets it on add or edit) and works out runningLow ...

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```
Source: commit `7516c67`.

| Rule | Detail |
|---|---|
| Subject | Imperative mood, sentence case, no trailing full stop, says what changes for the shop ("Keep a cleared reorder level blank and test bad levels on edit", `8f9b6bf`) |
| Body (optional) | Plain-language why and what, wrapped at about 72 characters; bullet lists are fine (`51f0385`) |
| Agent commits | End with a `Co-Authored-By:` trailer (`7516c67`, `51f0385`) |
| Issue references | Not in commits. The GitHub issue goes in the PR body as `Closes #N` (PR #34: "Closes #8.") |
| Scope | One logical change per commit; a multi-task feature is several commits (`7516c67`, `43235cd`, `8f9b6bf` for PR #34) |

---

## Merge Strategy

**Merge commit via a GitHub pull request.** The merge subject is GitHub's default: `Merge pull request #N from CynthiaTaylorEPAM/<branch>`, with the PR title as the body (`096bbc0`, `582dbc1`, `5d283ca`, `42ea9db`).

- Never commit straight to `main`. Every change reaches `main` through a PR with CI green.
- Keep `main` demonstrable: it must start cleanly with demo data and pass CI (`docs/purpose.md:53`).
- No squash or rebase merges; branch commits are kept as written.
- When two open branches must be proven together, merge one into the other with a descriptive message, as in `91afa6e` "Merge the per-tome reorder level feature into the test suite".

---

## Pull Requests

### PR title
A plain sentence describing the outcome for the shop, no prefix: "Give each tome its own reorder level on the Running low panel" (PR #34), "Add a layered test suite and fix three defects it found" (PR #35).

### PR description
Written for a non-technical reader (`AGENTS.md:12`, `docs/purpose.md:56`). Use PR #34's sections:

| Section | Contents |
|---|---|
| What this changes | Before and after in shop terms; `Closes #N` |
| Who it is for | Each affected persona from `docs/personas.md` and what changes for them, including who is refused |
| What was done | Bold one-line outcomes, each with a short plain explanation; docs touched (`docs/api.md`, personas) |
| Changes outside the issue (if any) | Anything unrelated that rode along, and why |
| Things to know before merging | Release order, gaps, side effects (for example test data left in a local DB) |
| Checks | Which gates passed (lint, typecheck, tests, build, Docker image, browser journeys) and any manual verification as owner and clerk |

End the description with the attribution line required for agent-created PRs.

---

## Anti-Patterns

| Bad | Good |
|---|---|
| `feat(catalog): add reorder_level column` | `Give each tome its own reorder level and say when it is running low` |
| `GG-8: reorder level` or `#8 reorder level` in a commit | Plain sentence in the commit; `Closes #8` in the PR body |
| `low-stock-threshold-per-tome: add planning artifacts` (`949c28c`, slug prefix) | `Add the planning notes for the per-tome reorder level` |
| `Updated the script for the trailer` (`210b283`, past tense) | `Update the script for the trailer` |
| `fix stuff`, `wip` | Say what changes: `Keep a cleared reorder level blank and test bad levels on edit` |
| Branch `testing-strategy` or `claude/charming-mayer-425agy` | `chore/testing-strategy`, `feature/<what-it-does>` |
| Pushing to `main` | Branch, PR, CI green, merge commit |
| PR description of file names and jargon | What changes for Mirabel and Pip, in plain words |
| Bounty board work in a PR to `main` | Rehearsal branch only, never merged |

---

## Common Commands

```bash
git fetch origin && git switch -c feature/<slug> origin/main
git commit -m "Give each tome its own reorder level"   # add Co-Authored-By trailer for agent commits
git push -u origin feature/<slug>
gh pr create --title "<plain sentence>" --body-file <description.md>
```

---

## Troubleshooting

| Problem | Fix |
|---|---|
| CI `check` job fails on tests locally passing | Run `npm run test:coverage` (coverage floors), `npm test -w @griffin/integration-tests` and `npm test -w @griffin/e2e-tests` as CI does (`.github/workflows/ci.yml:36-39`) |
| CI `e2e` job fails | Download the `browser-test-report` artifact (`.github/workflows/ci.yml:65-72`); reproduce with `docker compose up --build` and `npm run test:e2e` |
| `npm audit` fails in CI | A high-severity advisory in a dependency (`.github/workflows/ci.yml:41`); update the dependency on the branch |
| Branch behind `main` with conflicts | Merge `origin/main` into the branch (merge commits are the norm); do not force-push shared branches |
| Two open PRs depend on each other | Merge one branch into the other and say why in the merge message (`91afa6e`) |
| Pipeline working files appearing in `git status` | `.ai-run/sdlc-factory/` and `.ai-run/runs/` are gitignored (`.gitignore:15-16`); do not commit them |
