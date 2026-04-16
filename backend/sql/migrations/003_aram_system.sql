-- ARAM augment decision system (encyclopedia + synergy + items)
-- Run after base schema; augments.tier uses prismatic for ARAM naming.

ALTER TABLE augments DROP CONSTRAINT IF EXISTS augments_tier_check;
ALTER TABLE augments ADD CONSTRAINT augments_tier_check
    CHECK (tier IN ('prismatic', 'gold', 'silver'));

-- Global augment tags (jsonb for flexible queries)
ALTER TABLE augments ADD COLUMN IF NOT EXISTS tags_json JSONB NOT NULL DEFAULT '[]'::jsonb;
-- Legacy text[] tags can coexist; app prefers tags_json for ARAM

CREATE TABLE IF NOT EXISTS champion_augment_synergy (
    champion_id INTEGER NOT NULL REFERENCES champions (id) ON DELETE CASCADE,
    augment_id INTEGER NOT NULL REFERENCES augments (id) ON DELETE CASCADE,
    base_score REAL NOT NULL CHECK (base_score >= 0 AND base_score <= 1),
    PRIMARY KEY (champion_id, augment_id)
);

CREATE INDEX IF NOT EXISTS idx_synergy_champion ON champion_augment_synergy (champion_id);

CREATE TABLE IF NOT EXISTS augment_item_recommendations (
    id SERIAL PRIMARY KEY,
    augment_id INTEGER NOT NULL REFERENCES augments (id) ON DELETE CASCADE,
    item_name TEXT NOT NULL,
    reason TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_aug_items ON augment_item_recommendations (augment_id);
