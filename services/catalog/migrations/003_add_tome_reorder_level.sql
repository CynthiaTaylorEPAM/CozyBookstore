-- Each tome carries its own reorder level: running low means stock <= reorder_level.
ALTER TABLE tomes ADD COLUMN reorder_level INTEGER NOT NULL DEFAULT 2 CHECK (reorder_level >= 0);
