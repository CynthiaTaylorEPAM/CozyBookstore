# Project Context

## Project Identity

| Field | Value | Source |
|---|---|---|
| Project name | The Gilded Griffin | README.md:1 |
| Repository/package | CynthiaTaylorEPAM/CozyBookstore (npm package `gilded-griffin`) | `git remote -v`, package.json:2 |
| Project code/key | none | user decision (2026-11-13) |

## Work Item Tracker

| Field | Value |
|---|---|
| Provider | GitHub Issues |
| Key/prefix | `#N` (GitHub issue number, e.g. #8) |

> Adapter configuration belongs exclusively in `## Ticket Adapter`. Do not duplicate adapter status or instructions in the Work Item Tracker table.

## Ticket Adapter

**Status**: configured
**Adapter**: GitHub CLI (`gh`) against the repository CynthiaTaylorEPAM/CozyBookstore; issues are tracked on GitHub Project #2 "Cozy Bookstore Hyperfactory Demo" (owner CynthiaTaylorEPAM).
**Lookup**: `gh issue view {{ID}} --repo CynthiaTaylorEPAM/CozyBookstore --json number,title,body,labels,url,comments` — the body holds the description and any acceptance criteria; issues often cite their source as `docs/backlog.md`, item N.
**Create**: `gh issue create --repo CynthiaTaylorEPAM/CozyBookstore --title-file {{TITLE_FILE}} --body-file {{BODY_FILE}}` with the complete approved story written to the files first; then `gh project item-add 2 --owner CynthiaTaylorEPAM --url <issue URL>`.
**Output**: Issue URL `https://github.com/CynthiaTaylorEPAM/CozyBookstore/issues/<N>`; refer to it as `#<N>`.
**Comment**: `gh issue comment {{ID}} --repo CynthiaTaylorEPAM/CozyBookstore --body-file {{BODY_FILE}}`

## Source Control And Review

| Field | Value |
|---|---|
| Provider | GitHub |
| Repository remote | https://github.com/CynthiaTaylorEPAM/CozyBookstore.git |
| Default target branch | main |
| Review artifact type | PR |

## MR Adapter

**Status**: configured
**Adapter**: GitHub CLI (`gh`).
**Instructions**: Check: `gh pr list --repo CynthiaTaylorEPAM/CozyBookstore --head <branch> --state open`. Create: `gh pr create --repo CynthiaTaylorEPAM/CozyBookstore --base main --head <branch> --title "$(cat {{TITLE_FILE}})" --body-file {{BODY_FILE}}`. If `gh` is not on PATH in the current shell, call it as `C:\Program Files\GitHub CLI\gh.exe`. The body ends with "Closes #N" for the issue it delivers.
**Body Template**: `## What this changes` · `## Who it is for` (name the personas from docs/personas.md) · `## What was done` · `## Things to know before merging` · `## Checks` — written for a non-technical reader.

## Complexity Scoring

**Status**: configured
**Field**: Effort
**Format**: t-shirt
