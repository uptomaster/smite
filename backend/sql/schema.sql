-- Supabase-compatible PostgreSQL schema for LoL Augment Recommendation MVP.
-- Enable UUID extension if you prefer UUID primary keys (optional).
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS champions (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS augments (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    tier TEXT NOT NULL CHECK (tier IN ('prism', 'gold', 'silver')),
    description TEXT NOT NULL,
    tags TEXT[] NOT NULL DEFAULT '{}'
);

-- Join table with performance stats; score can be materialized offline or computed in app.
CREATE TABLE IF NOT EXISTS champion_augment (
    id SERIAL PRIMARY KEY,
    champion_id INTEGER NOT NULL REFERENCES champions (id) ON DELETE CASCADE,
    augment_id INTEGER NOT NULL REFERENCES augments (id) ON DELETE CASCADE,
    winrate REAL NOT NULL CHECK (winrate >= 0 AND winrate <= 1),
    pickrate REAL NOT NULL CHECK (pickrate >= 0 AND pickrate <= 1),
    trend REAL NOT NULL CHECK (trend >= 0 AND trend <= 1),
    score REAL NOT NULL CHECK (score >= 0 AND score <= 1),
    reason TEXT,
    UNIQUE (champion_id, augment_id)
);

CREATE INDEX IF NOT EXISTS idx_champion_augment_champion ON champion_augment (champion_id);
CREATE INDEX IF NOT EXISTS idx_champion_augment_augment ON champion_augment (augment_id);
