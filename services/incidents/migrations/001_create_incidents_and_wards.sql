CREATE TABLE incidents (
  id             SERIAL PRIMARY KEY,
  monster        TEXT NOT NULL,
  severity       TEXT NOT NULL,                    -- minor, troublesome, dire
  description    TEXT NOT NULL,
  -- The damaged tome lives in the catalog service, so there is no foreign key.
  tome_id        INTEGER,
  tome_title     TEXT,
  copies_damaged INTEGER NOT NULL DEFAULT 0 CHECK (copies_damaged >= 0),
  status         TEXT NOT NULL DEFAULT 'open',     -- open, resolved
  reported_by    TEXT NOT NULL,
  reported_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_by    TEXT,
  resolved_at    TIMESTAMPTZ,
  resolution     TEXT
);

CREATE TABLE wards (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  location    TEXT NOT NULL,
  description TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'holding'      -- holding, flickering, broken
);
