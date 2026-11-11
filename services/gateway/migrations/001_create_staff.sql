CREATE TABLE staff (
  id            SERIAL PRIMARY KEY,
  username      TEXT NOT NULL UNIQUE,
  display_name  TEXT NOT NULL,
  role          TEXT NOT NULL,          -- owner, clerk
  password_hash TEXT NOT NULL
);
