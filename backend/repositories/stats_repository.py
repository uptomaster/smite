"""Load aggregated champion–augment stats from PostgreSQL."""

from __future__ import annotations

import logging
from dataclasses import dataclass

from db.pool import get_pool

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class ChampionAugmentStatRow:
    augment_id: int
    winrate: float
    pickrate: float
    trend: float
    games_played: int
    patch_version: str
    reason: str | None
    augment_name: str
    tier: str
    tags: list[str]


def fetch_champion_augment_stats(champion_name: str) -> list[ChampionAugmentStatRow]:
    """
    Latest patch rows for a champion. Empty list if no DB or no data.
    """
    pool = get_pool()
    if not pool:
        return []
    try:
        with pool.connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    WITH latest AS (
                        SELECT MAX(ca.patch_version) AS pv
                        FROM champion_augment ca
                        INNER JOIN champions c ON c.id = ca.champion_id
                        WHERE LOWER(c.name) = LOWER(%s)
                    )
                    SELECT
                        ca.augment_id,
                        ca.winrate,
                        ca.pickrate,
                        ca.trend,
                        ca.games_played,
                        ca.patch_version,
                        ca.reason,
                        a.name,
                        a.tier,
                        a.tags
                    FROM champion_augment ca
                    INNER JOIN champions c ON c.id = ca.champion_id
                    INNER JOIN augments a ON a.id = ca.augment_id
                    CROSS JOIN latest
                    WHERE LOWER(c.name) = LOWER(%s)
                      AND ca.patch_version = latest.pv
                    """,
                    (champion_name.strip(), champion_name.strip()),
                )
                rows = cur.fetchall()
                out: list[ChampionAugmentStatRow] = []
                for r in rows:
                    tags = r[9] if r[9] is not None else []
                    if hasattr(tags, "split"):  # rare string fallback
                        tags = []
                    out.append(
                        ChampionAugmentStatRow(
                            augment_id=int(r[0]),
                            winrate=float(r[1]),
                            pickrate=float(r[2]),
                            trend=float(r[3]),
                            games_played=int(r[4]),
                            patch_version=str(r[5]),
                            reason=r[6],
                            augment_name=str(r[7]),
                            tier=str(r[8]),
                            tags=list(tags) if tags else [],
                        )
                    )
                return out
    except Exception as exc:
        logger.warning("fetch_champion_augment_stats failed: %s", exc)
        return []
