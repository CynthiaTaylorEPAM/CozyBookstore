CREATE TABLE patrons (
  id        SERIAL PRIMARY KEY,
  name      TEXT NOT NULL,
  race      TEXT NOT NULL,
  tier      TEXT NOT NULL DEFAULT 'wanderer',   -- wanderer, regular, fellow
  home      TEXT NOT NULL DEFAULT '',
  notes     TEXT NOT NULL DEFAULT '',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- tome_id points at a tome owned by the catalog service, so there is no
-- foreign key. The title and price are copied in at the moment of sale.
CREATE TABLE sales (
  id            SERIAL PRIMARY KEY,
  patron_id     INTEGER NOT NULL REFERENCES patrons(id),
  tome_id       INTEGER NOT NULL,
  tome_title    TEXT NOT NULL,
  quantity      INTEGER NOT NULL CHECK (quantity > 0),
  unit_price_cp INTEGER NOT NULL,
  total_cp      INTEGER NOT NULL,
  sold_by       TEXT NOT NULL,
  sold_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
