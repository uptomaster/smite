"""Champion name resolution against PostgreSQL (optional)."""

from __future__ import annotations

import logging

from db.pool import get_pool

logger = logging.getLogger(__name__)


def resolve_champion_id_from_db(name: str) -> int | None:
    """Return internal champion id by exact name match (case-insensitive)."""
    pool = get_pool()
    if not pool:
        return None
    try:
        with pool.connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT id FROM champions WHERE LOWER(name) = LOWER(%s) LIMIT 1",
                    (name.strip(),),
                )
                row = cur.fetchone()
                return int(row[0]) if row else None
    except Exception as exc:
        logger.warning("resolve_champion_id_from_db failed: %s", exc)
        return None


def champion_names_from_db(prefix: str, limit: int) -> list[str] | None:
    """Prefix search on champion names; returns None if DB unavailable."""
    pool = get_pool()
    if not pool:
        return None
    try:
        with pool.connection() as conn:
            with conn.cursor() as cur:
                if not prefix.strip():
                    cur.execute(
                        "SELECT name FROM champions ORDER BY name LIMIT %s",
                        (limit,),
                    )
                else:
                    cur.execute(
                        """
                        SELECT name FROM champions
                        WHERE name ILIKE %s
                        ORDER BY name
                        LIMIT %s
                        """,
                        (f"{prefix.strip()}%", limit),
                    )
                return [r[0] for r in cur.fetchall()]
    except Exception as exc:
        logger.warning("champion_names_from_db failed: %s", exc)
        return None
