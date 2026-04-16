-- Sample seed aligned with backend/data/mock_data.py (subset for local Postgres testing).
-- Run after schema.sql.

INSERT INTO champions (id, name) VALUES
  (1, 'Ezreal'),
  (2, 'Jinx'),
  (3, 'Ashe')
ON CONFLICT (id) DO NOTHING;

SELECT setval(pg_get_serial_sequence('champions', 'id'), (SELECT MAX(id) FROM champions));

INSERT INTO augments (id, name, tier, description, tags) VALUES
  (1, 'Ability Haste Boost', 'prism', 'Cooldown reduction for faster spell rotations.', ARRAY['damage', 'caster']),
  (3, 'Second Wind Surge', 'silver', 'Recovery between trades to stay healthy.', ARRAY['sustain', 'lane']),
  (4, 'Piercing Intent', 'prism', 'Armor penetration and burst damage.', ARRAY['damage', 'carry'])
ON CONFLICT (id) DO NOTHING;

SELECT setval(pg_get_serial_sequence('augments', 'id'), (SELECT MAX(id) FROM augments));

-- score column stores base formula (winrate*0.6 + pickrate*0.2 + trend*0.2) without context multipliers.
INSERT INTO champion_augment (id, champion_id, augment_id, winrate, pickrate, trend, score, reason) VALUES
  (1, 1, 1, 0.58, 0.31, 0.72, 0.554, 'Improves DPS through cooldown reduction.'),
  (2, 1, 3, 0.52, 0.22, 0.58, 0.472, 'Helps you sustain through long-range poking.'),
  (3, 1, 4, 0.55, 0.28, 0.68, 0.522, 'Amplifies burst damage against squishy targets.')
ON CONFLICT (id) DO NOTHING;

SELECT setval(pg_get_serial_sequence('champion_augment', 'id'), (SELECT MAX(id) FROM champion_augment));
