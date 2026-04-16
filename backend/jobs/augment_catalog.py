"""Fetch Arena augment metadata from Community Dragon and upsert into PostgreSQL."""

from __future__ import annotations

import logging
from typing import Any

import httpx

logger = logging.getLogger(__name__)

CDRAGON_ARENA = "https://raw.communitydragon.org/latest/cdragon/arena/en_us.json"


def infer_tier(aug: dict[str, Any]) -> str:
    """Map CDragon rarity to UI tiers (prism / gold / silver)."""
    rarity = str(aug.get("rarity") or aug.get("tier") or "").lower()
    name = str(aug.get("name") or "").lower()
    if "prism" in rarity or "prism" in name:
        return "prism"
    if "gold" in rarity or "legendary" in rarity:
        return "gold"
    return "silver"


def infer_tags(aug: dict[str, Any]) -> list[str]:
    """Lightweight tags for recommendation overlays (extend as needed)."""
    desc = str(aug.get("desc") or aug.get("description") or "").lower()
    tags: list[str] = []
    if any(x in desc for x in ("heal", "regen", "lifesteal", "omnivamp")):
        tags.append("sustain")
    if any(x in desc for x in ("armor", "resist", "shield", "tank", "health")):
        tags.append("defense")
    if any(x in desc for x in ("damage", "ad", "ap", "crit")):
        tags.append("damage")
    if not tags:
        tags.append("utility")
    return tags[:4]


def fetch_arena_augments() -> list[dict[str, Any]]:
    with httpx.Client(timeout=60.0) as client:
        r = client.get(CDRAGON_ARENA)
        r.raise_for_status()
        data = r.json()
    if isinstance(data, dict):
        if "augments" in data and isinstance(data["augments"], list):
            return list(data["augments"])
        if "data" in data and isinstance(data["data"], list):
            return list(data["data"])
    if isinstance(data, list):
        return data
    logger.warning("Unexpected CDragon arena JSON shape")
    return []


def upsert_augments_from_cdragon(conn) -> int:
    """Insert or update augments from Community Dragon. Returns rows touched."""
    rows = fetch_arena_augments()
    n = 0
    with conn.cursor() as cur:
        for aug in rows:
            rid = aug.get("id")
            if rid is None:
                continue
            name = str(aug.get("name") or f"Augment {rid}")[:200]
            tier = infer_tier(aug)
            desc = str(aug.get("desc") or aug.get("description") or "")[:2000]
            tags = infer_tags(aug)
            cur.execute(
                """
                INSERT INTO augments (riot_augment_id, name, tier, description, tags)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (riot_augment_id) DO UPDATE SET
                    name = EXCLUDED.name,
                    tier = EXCLUDED.tier,
                    description = EXCLUDED.description,
                    tags = EXCLUDED.tags
                """,
                (int(rid), name, tier, desc, tags),
            )
            n += 1
    return n
