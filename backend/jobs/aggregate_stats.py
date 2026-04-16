"""
Aggregate match_augment_facts → champion_augment for the latest patch seen in facts.
Run after collect_matches or standalone to refresh materialized stats.
"""

from __future__ import annotations

import argparse
import logging
import os
import sys
from collections import defaultdict

from dotenv import load_dotenv

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def aggregate(conn, patch_version: str | None = None) -> int:
    """
    Upsert champion_augment rows for the given patch (or latest patch in facts).
    Returns number of upserts executed.
    """
    with conn.cursor() as cur:
        if patch_version is None:
            cur.execute("SELECT MAX(patch_version) FROM match_augment_facts")
            row = cur.fetchone()
            patch_version = row[0] if row and row[0] else None
        if not patch_version:
            logger.warning("No facts to aggregate.")
            return 0

        cur.execute(
            """
            SELECT champion_riot_id, augment_riot_id, win, match_id
            FROM match_augment_facts
            WHERE patch_version = %s
            """,
            (patch_version,),
        )
        raw = cur.fetchall()

    champ_matches: dict[int, set[str]] = defaultdict(set)
    pair_wins: dict[tuple[int, int], list[bool]] = defaultdict(list)

    for champion_riot_id, augment_riot_id, win, match_id in raw:
        champ_matches[champion_riot_id].add(match_id)
        pair_wins[(champion_riot_id, augment_riot_id)].append(bool(win))

    champ_tot_games = {cid: len(ms) for cid, ms in champ_matches.items()}
    inserted = 0

    with conn.cursor() as cur:
        for (c_riot, a_riot), wins in pair_wins.items():
            games = len(wins)
            if games == 0:
                continue
            winrate = sum(1 for w in wins if w) / games
            total = champ_tot_games.get(c_riot) or games
            pickrate = min(1.0, games / total) if total else 0.0
            trend = min(1.0, max(0.0, winrate))
            conf = min(1.0, games / 5000)
            score_placeholder = min(
                1.0,
                winrate * 0.5 + pickrate * 0.2 + trend * 0.1 + conf * 0.2,
            )

            cur.execute(
                """
                SELECT c.id, a.id FROM champions c
                INNER JOIN augments a ON a.riot_augment_id = %s
                WHERE c.riot_champion_id = %s
                """,
                (a_riot, c_riot),
            )
            row = cur.fetchone()
            if not row:
                continue
            cid, aid = int(row[0]), int(row[1])
            reason = (
                f"Aggregated from Riot data (patch {patch_version}). "
                f"Win {winrate:.0%} over {games} games."
            )
            cur.execute(
                """
                INSERT INTO champion_augment (
                    champion_id, augment_id, winrate, pickrate, trend, score,
                    reason, games_played, patch_version
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (champion_id, augment_id) DO UPDATE SET
                    winrate = EXCLUDED.winrate,
                    pickrate = EXCLUDED.pickrate,
                    trend = EXCLUDED.trend,
                    score = EXCLUDED.score,
                    reason = EXCLUDED.reason,
                    games_played = EXCLUDED.games_played,
                    patch_version = EXCLUDED.patch_version
                """,
                (
                    cid,
                    aid,
                    winrate,
                    pickrate,
                    trend,
                    score_placeholder,
                    reason,
                    games,
                    patch_version,
                ),
            )
            inserted += 1

    logger.info("Aggregated patch %s → %s champion_augment upserts", patch_version, inserted)
    return inserted


def main() -> None:
    load_dotenv()
    dsn = os.environ.get("DATABASE_URL")
    if not dsn:
        raise SystemExit("DATABASE_URL required")

    parser = argparse.ArgumentParser()
    parser.add_argument("--patch", default=None, help="Patch version (default: latest in facts)")
    args = parser.parse_args()

    import psycopg

    with psycopg.connect(dsn) as conn:
        aggregate(conn, args.patch)
        conn.commit()


if __name__ == "__main__":
    main()
