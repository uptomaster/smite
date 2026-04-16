-- Data pipeline: Riot Match-V5 ingestion + aggregate stats
-- Run after schema.sql (or apply on existing DB).

ALTER TABLE champions ADD COLUMN IF NOT EXISTS riot_champion_id INTEGER UNIQUE;

ALTER TABLE augments ADD COLUMN IF NOT EXISTS riot_augment_id INTEGER UNIQUE;

ALTER TABLE champion_augment DROP CONSTRAINT IF EXISTS champion_augment_score_check;
ALTER TABLE champion_augment ALTER COLUMN score DROP NOT NULL;

ALTER TABLE champion_augment ADD COLUMN IF NOT EXISTS games_played INTEGER NOT NULL DEFAULT 0;
ALTER TABLE champion_augment ADD COLUMN IF NOT EXISTS patch_version TEXT NOT NULL DEFAULT 'unknown';

CREATE INDEX IF NOT EXISTS idx_champion_augment_patch ON champion_augment (champion_id, patch_version DESC);
CREATE INDEX IF NOT EXISTS idx_champion_augment_games ON champion_augment (games_played DESC);

-- Raw facts: one row per augment pick in a match (Arena / augment modes).
CREATE TABLE IF NOT EXISTS match_augment_facts (
    id BIGSERIAL PRIMARY KEY,
    match_id TEXT NOT NULL,
    participant_puuid TEXT NOT NULL,
    champion_riot_id INTEGER NOT NULL,
    augment_riot_id INTEGER NOT NULL,
    win BOOLEAN NOT NULL,
    patch_version TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (match_id, participant_puuid, augment_riot_id)
);

CREATE INDEX IF NOT EXISTS idx_facts_champion ON match_augment_facts (champion_riot_id, patch_version);
CREATE INDEX IF NOT EXISTS idx_facts_match ON match_augment_facts (match_id);
