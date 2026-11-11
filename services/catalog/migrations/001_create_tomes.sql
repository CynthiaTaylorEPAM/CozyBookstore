CREATE TABLE tomes (
  id          SERIAL PRIMARY KEY,
  title       TEXT NOT NULL,
  author      TEXT NOT NULL,
  genre       TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price_cp    INTEGER NOT NULL CHECK (price_cp >= 0),   -- price in copper pieces
  stock       INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  condition   TEXT NOT NULL DEFAULT 'pristine',
  restricted  BOOLEAN NOT NULL DEFAULT FALSE,           -- kept in the locked cabinet
  featured    BOOLEAN NOT NULL DEFAULT FALSE,           -- shown in the shop window (landing page)
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Every change to stock is written down, like a ledger.
CREATE TABLE stock_adjustments (
  id          SERIAL PRIMARY KEY,
  tome_id     INTEGER NOT NULL REFERENCES tomes(id) ON DELETE CASCADE,
  delta       INTEGER NOT NULL,
  reason      TEXT NOT NULL,
  adjusted_by TEXT NOT NULL,
  adjusted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
