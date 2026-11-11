# API

All paths are as seen through the gateway. Requests and responses are JSON. Errors look like `{ "error": "message" }`.

Staff routes need the header `Authorization: Bearer <token>`, using the token from `POST /api/auth/login`.

**Access:** public = no login · staff = owner or clerk · owner = owner only

## Gateway

| Method | Path | Access | Purpose |
|---|---|---|---|
| POST | `/api/auth/login` | public | `{ username, password }` → `{ token, staff }` |
| GET | `/api/auth/me` | staff | Who the token belongs to |
| GET | `/health` | public | Liveness check (every service has one) |

## Catalog service

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/api/public/tomes` | public | Featured tomes for the landing page |
| GET | `/api/tomes?q=&genre=` | staff | List and search tomes |
| GET | `/api/tomes/:id` | staff | One tome |
| POST | `/api/tomes` | owner | Add a tome |
| PATCH | `/api/tomes/:id` | owner | Change details, price, featured, restricted |
| POST | `/api/tomes/:id/stock-adjustments` | staff | `{ delta, reason }`. 409 if stock would go below zero |
| GET | `/api/tomes/:id/stock-adjustments` | staff | The stock ledger for a tome |

## Patrons service

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/api/public/patron-stats` | public | Patron counts by race, no names |
| GET | `/api/patrons` | staff | List patrons with total spent |
| GET | `/api/patrons/:id` | staff | One patron with purchase history |
| POST | `/api/patrons` | staff | Register a patron |
| PATCH | `/api/patrons/:id` | owner | Change tier, home, notes |
| GET | `/api/sales` | staff | The 50 most recent sales |
| POST | `/api/sales` | staff | `{ patronId, tomeId, quantity }`. Takes stock from the catalog |
| GET | `/api/sales/summary` | owner | Takings and best sellers |

## Incidents service

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/api/public/shop-status` | public | Mood (calm, wary, besieged), open incident count, wards |
| GET | `/api/wards` | staff | Wards with descriptions |
| GET | `/api/incidents?status=` | staff | List incidents, open first |
| POST | `/api/incidents` | staff | `{ monster, severity, description, tomeId?, copiesDamaged? }`. Removes damaged copies from the catalog |
| POST | `/api/incidents/:id/resolve` | owner | `{ resolution }`. 409 if already resolved |

Valid values for `genre`, `race`, `tier`, `monster`, `severity` and `condition` are in `packages/shared/src/domain.ts`.
