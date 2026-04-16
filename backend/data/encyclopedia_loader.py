"""
Official-style augment encyclopedia from Community Dragon + restriction tags.
Singleton list used by the recommendation engine.
"""

from __future__ import annotations

import json
import logging
import re
from dataclasses import asdict
from pathlib import Path
from typing import Any

import httpx

from data.aram_catalog import AugmentRecord, Tier, infer_tags_from_description

logger = logging.getLogger(__name__)

CDRAGON_URL = "https://raw.communitydragon.org/latest/cdragon/arena/en_us.json"

_ENC: list[AugmentRecord] | None = None


def _map_rarity_to_tier(r: str | int | None) -> Tier:
    s = str(r).lower() if r is not None else ""
    if "prism" in s or s in ("3", "prismatic"):
        return "prismatic"
    if "gold" in s or "legend" in s or s == "2":
        return "gold"
    return "silver"


def _gameplay_tags(name: str, desc: str) -> list[str]:
    base = infer_tags_from_description(desc, [])
    t = f"{name} {desc}".lower()
    extra: list[str] = []
    if any(x in t for x in ("mana", "manaflow", "seraph", "archangel")):
        extra.append("mana_scaling")
    if re.search(r"\battack damage\b|\bad ratio\b|\bcrit\b|\blethality\b", t):
        extra.append("ad_scaling")
    if "ability power" in t or "ap ratio" in t or " magic damage" in t:
        extra.append("ap_scaling")
    if any(x in t for x in ("stun", "slow", "root", "knock", "aftershock", "cc")):
        extra.append("cc_augment")
    merged = base + extra
    seen: set[str] = set()
    out: list[str] = []
    for x in merged:
        if x not in seen:
            seen.add(x)
            out.append(x)
    return out[:14]


def _excluded_from_tags(tags: list[str], name: str, desc: str) -> tuple[str, ...]:
    """Champion kit tags that disqualify this augment (matches augment_restrictions.excluded_tags)."""
    exc: list[str] = []
    t = f"{name} {desc}".lower()
    if "mana_scaling" in tags:
        exc.append("no_mana")
    if "ad_scaling" in tags and "ap_scaling" not in tags:
        exc.append("ap_primary")
    if "ap_scaling" in tags and "ad_scaling" not in tags:
        exc.append("ad_primary")
    if "cc_augment" in tags or ("cc" in tags and "aftershock" in t):
        exc.append("no_cc")
    # Hard rules from wording
    if "manaless" in t or "energy" in t and "mana" not in t:
        pass
    seen: set[str] = set()
    u: list[str] = []
    for x in exc:
        if x not in seen:
            seen.add(x)
            u.append(x)
    return tuple(u)


def _parse_cdragon(data: Any) -> list[AugmentRecord]:
    rows: list[dict[str, Any]]
    if isinstance(data, dict) and "augments" in data:
        rows = list(data["augments"])
    elif isinstance(data, list):
        rows = list(data)
    else:
        return []

    out: list[AugmentRecord] = []
    for raw in rows:
        if not isinstance(raw, dict):
            continue
        aid = raw.get("id")
        if aid is None:
            continue
        name = str(raw.get("name") or raw.get("title") or f"Augment {aid}")[:220]
        desc = str(raw.get("desc") or raw.get("description") or "")[:4500]
        tier = _map_rarity_to_tier(raw.get("rarity") or raw.get("tier"))
        gtags = _gameplay_tags(name, desc)
        exc = _excluded_from_tags(gtags, name, desc)
        out.append(
            AugmentRecord(
                id=int(aid),
                name=name,
                tier=tier,
                description=desc or name,
                tags=tuple(gtags),
                excluded_champion_tags=exc,
            )
        )
    return out


def _load_cdragon_http() -> list[AugmentRecord]:
    with httpx.Client(timeout=25.0) as client:
        r = client.get(CDRAGON_URL)
        r.raise_for_status()
        augments = _parse_cdragon(r.json())
    if len(augments) < 15:
        raise ValueError("CDragon parse too small")
    return augments


def _load_fallback() -> list[AugmentRecord]:
    from data.aram_catalog import AUGMENTS

    out: list[AugmentRecord] = []
    for a in AUGMENTS:
        gtags = list(a.tags)
        exc = _excluded_from_tags(gtags + infer_tags_from_description(a.description, []), a.name, a.description)
        out.append(
            AugmentRecord(
                a.id,
                a.name,
                a.tier,
                a.description,
                tuple(gtags),
                exc,
            )
        )
    return out


def get_augment_encyclopedia() -> list[AugmentRecord]:
    global _ENC
    if _ENC is not None:
        return _ENC

    cache_path = Path(__file__).resolve().parent / "arena_augments_cache.json"
    if cache_path.exists():
        try:
            raw = json.loads(cache_path.read_text(encoding="utf-8"))
            _ENC = [
                AugmentRecord(
                    id=int(x["id"]),
                    name=x["name"],
                    tier=x["tier"],
                    description=x["description"],
                    tags=tuple(x["tags"]),
                    excluded_champion_tags=tuple(x.get("excluded_champion_tags", [])),
                )
                for x in raw
            ]
            logger.info("Loaded %s augments from disk cache", len(_ENC))
            return _ENC
        except Exception as exc:
            logger.warning("cache invalid: %s", exc)

    try:
        _ENC = _load_cdragon_http()
        try:
            cache_path.write_text(
                json.dumps([asdict(a) for a in _ENC], ensure_ascii=False),
                encoding="utf-8",
            )
        except OSError as exc:
            logger.warning("could not write augment cache: %s", exc)
        logger.info("Loaded %s augments from Community Dragon", len(_ENC))
    except Exception as exc:
        logger.warning("CDragon failed (%s); using bundled fallback list", exc)
        _ENC = _load_fallback()

    return _ENC


def augment_by_id(aid: int) -> AugmentRecord | None:
    for a in get_augment_encyclopedia():
        if a.id == aid:
            return a
    return None


def reset_encyclopedia_cache() -> None:
    """Test hook."""
    global _ENC
    _ENC = None
