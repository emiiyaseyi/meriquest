-- MeriQuest storage: one generic document table behind the Store interface.
-- Collections (users, sessions, config, audit, placements, ...) are rows keyed by (col, id).
-- Safe on any Postgres (Layerbase, Neon, Supabase, self-hosted).

CREATE TABLE IF NOT EXISTS kv (
  col        text        NOT NULL CHECK (col ~ '^[a-z][a-z0-9_]{0,40}$'),
  id         text        NOT NULL CHECK (char_length(id) BETWEEN 1 AND 200),
  doc        jsonb       NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (col, id)
);

CREATE INDEX IF NOT EXISTS kv_col_idx ON kv (col);

-- Defence in depth: if this database is ever exposed through a public API (as Supabase does), the
-- table has row level security on and NO policies, so anonymous and signed-in API roles read nothing.
-- The application connects as the table owner, which is not subject to RLS.
ALTER TABLE kv ENABLE ROW LEVEL SECURITY;
