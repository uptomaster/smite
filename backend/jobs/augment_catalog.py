"""Fetch Arena augment metadata from Community Dragon and upsert into PostgreSQL."""

from __future__ import annotations

import html
import logging
import re
from typing import Any

import httpx

logger = logging.getLogger(__name__)

CDRAGON_ARENA_EN = "https://raw.communitydragon.org/latest/cdragon/arena/en_us.json"
CDRAGON_ARENA_KO = "https://raw.communitydragon.org/latest/cdragon/arena/ko_kr.json"


def _strip_tooltip_html(raw: str) -> str:
    if not raw:
        return ""
    t = re.sub(r"(?i)<br\s*/?>", " ", raw)
    t = re.sub(r"<[^>]+>", " ", t)
    t = html.unescape(t)
    t = re.sub(r"\s+", " ", t).strip()
    return t


def infer_tier(aug: dict[str, Any]) -> str:
    """Map CDragon rarity to DB tiers (prismatic | gold | silver)."""
    r = aug.get("rarity")
    if isinstance(r, int):
        if r >= 2:
            return "prismatic"
        if r == 1:
            return "gold"
        return "silver"
    if isinstance(r, str) and r.strip().isdigit():
        return infer_tier({"rarity": int(r.strip())})
    rarity = str(r or aug.get("tier") or "").lower()
    name = str(aug.get("name") or "").lower()
    if "prism" in rarity or "prism" in name:
        return "prismatic"
    if "gold" in rarity or "legend" in rarity:
        return "gold"
    return "silver"


def infer_tags(aug: dict[str, Any]) -> list[str]:
    """Lightweight tags for recommendation overlays (extend as needed)."""
    desc = _strip_tooltip_html(str(aug.get("desc") or aug.get("description") or "")).lower()
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


def _parse_aug_list(data: Any) -> list[dict[str, Any]]:
    if isinstance(data, dict):
        if "augments" in data and isinstance(data["augments"], list):
            return list(data["augments"])
        if "data" in data and isinstance(data["data"], list):
            return list(data["data"])
    if isinstance(data, list):
        return data
    return []


def fetch_arena_augments_merged() -> list[tuple[dict[str, Any], dict[str, Any]]]:
    with httpx.Client(timeout=60.0) as client:
        re = client.get(CDRAGON_ARENA_EN)
        re.raise_for_status()
        rk = client.get(CDRAGON_ARENA_KO)
        rk.raise_for_status()
        en_list = _parse_aug_list(re.json())
        ko_list = _parse_aug_list(rk.json())
    en_by = {int(a["id"]): a for a in en_list if isinstance(a, dict) and a.get("id") is not None}
    ko_by = {int(a["id"]): a for a in ko_list if isinstance(a, dict) and a.get("id") is not None}
    pairs: list[tuple[dict[str, Any], dict[str, Any]]] = []
    for aid in sorted(set(en_by) & set(ko_by)):
        pairs.append((en_by[aid], ko_by[aid]))
    return pairs


def upsert_augments_from_cdragon(conn) -> int:
    """Insert or update augments from Community Dragon (Korean display, English-backed tags). Returns rows touched."""
    pairs = fetch_arena_augments_merged()
    n = 0
    with conn.cursor() as cur:
        for en_aug, ko_aug in pairs:
            rid = en_aug.get("id")
            if rid is None:
                continue
            name_ko = str(ko_aug.get("name") or en_aug.get("name") or f"Augment {rid}")[:200]
            tier = infer_tier(en_aug)
            desc_ko_raw = str(ko_aug.get("desc") or ko_aug.get("description") or en_aug.get("desc") or "")
            desc = _strip_tooltip_html(desc_ko_raw)[:2000]
            tags = infer_tags(en_aug)
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
                (int(rid), name_ko, tier, desc, tags),
            )
            n += 1
    return n
