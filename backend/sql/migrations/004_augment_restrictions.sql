-- Champion kit tags that disqualify an augment (mirrors AugmentRecord.excluded_champion_tags in app).
-- Examples: no_mana, ap_primary, ad_primary, no_cc

CREATE TABLE IF NOT EXISTS augment_restrictions (
    augment_id INTEGER NOT NULL REFERENCES augments (id) ON DELETE CASCADE,
    excluded_tags TEXT[] NOT NULL DEFAULT '{}',
    PRIMARY KEY (augment_id)
);

CREATE INDEX IF NOT EXISTS idx_aug_restrictions_gin ON augment_restrictions USING GIN (excluded_tags);
