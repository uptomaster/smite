"""
Official-style augment encyclopedia from Community Dragon (en_us + ko_kr) + restriction tags.
Korean name/description for UI; English retained for tag inference and search.
"""

from __future__ import annotations

import html
import json
import logging
import re
from dataclasses import asdict
from pathlib import Path
from typing import Any

import httpx

from data.aram_catalog import AugmentRecord, Tier, infer_tags_from_description

logger = logging.getLogger(__name__)

CDRAGON_EN = "https://raw.communitydragon.org/latest/cdragon/arena/en_us.json"
CDRAGON_KO = "https://raw.communitydragon.org/latest/cdragon/arena/ko_kr.json"

_ENC: list[AugmentRecord] | None = None


def _map_rarity_to_tier(r: str | int | None) -> Tier:
    if isinstance(r, int):
        if r >= 2:
            return "prismatic"
        if r == 1:
            return "gold"
        return "silver"
    if isinstance(r, str) and r.strip().isdigit():
        return _map_rarity_to_tier(int(r.strip()))
    s = str(r).lower() if r is not None else ""
    if "prism" in s or "prismatic" in s:
        return "prismatic"
    if "gold" in s or "legend" in s:
        return "gold"
    return "silver"


def _strip_tooltip_html(raw: str) -> str:
    if not raw:
        return ""
    t = re.sub(r"(?i)<br\s*/?>", "\n", raw)
    t = re.sub(r"<[^>]+>", " ", t)
    t = html.unescape(t)
    t = re.sub(r"[ \t]+", " ", t)
    t = re.sub(r"\n\s*\n+", "\n", t)
    return t.strip()


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
    if "manaless" in t or "energy" in t and "mana" not in t:
        pass
    seen: set[str] = set()
    u: list[str] = []
    for x in exc:
        if x not in seen:
            seen.add(x)
            u.append(x)
    return tuple(u)


def _resolve_icon_url(raw: dict[str, Any]) -> str | None:
    p = raw.get("iconPath") or raw.get("squarePortraitPath") or raw.get("image") or raw.get("icon")
    if not p or not isinstance(p, str):
        return None
    p = p.strip()
    if p.startswith("http"):
        return p
    return f"https://raw.communitydragon.org/latest/{p.lstrip('/')}"


def _parse_rows(data: Any) -> list[dict[str, Any]]:
    if isinstance(data, dict) and "augments" in data:
        return list(data["augments"])
    if isinstance(data, list):
        return list(data)
    return []


def _merge_locale_rows(en_rows: list[dict[str, Any]], ko_rows: list[dict[str, Any]]) -> list[AugmentRecord]:
    en_by_id: dict[int, dict[str, Any]] = {}
    for raw in en_rows:
        if not isinstance(raw, dict):
            continue
        aid = raw.get("id")
        if aid is None:
            continue
        en_by_id[int(aid)] = raw
    ko_by_id: dict[int, dict[str, Any]] = {}
    for raw in ko_rows:
        if not isinstance(raw, dict):
            continue
        aid = raw.get("id")
        if aid is None:
            continue
        ko_by_id[int(aid)] = raw

    ids = sorted(set(en_by_id) & set(ko_by_id))
    out: list[AugmentRecord] = []
    for i in ids:
        er = en_by_id[i]
        kr = ko_by_id[i]
        name_en = str(er.get("name") or er.get("title") or f"Augment {i}")[:220]
        desc_en_raw = str(er.get("desc") or er.get("description") or "")
        desc_en = _strip_tooltip_html(desc_en_raw)[:4500]

        name_ko = str(kr.get("name") or name_en)[:220]
        desc_ko_raw = str(kr.get("desc") or kr.get("description") or desc_en_raw)
        desc_ko = _strip_tooltip_html(desc_ko_raw)[:4500] or name_ko

        tier = _map_rarity_to_tier(er.get("rarity") if er.get("rarity") is not None else kr.get("rarity"))
        gtags = _gameplay_tags(name_en, desc_en)
        exc = _excluded_from_tags(gtags, name_en, desc_en)
        icon = _resolve_icon_url(er)
        out.append(
            AugmentRecord(
                id=i,
                name=name_ko,
                tier=tier,
                description=desc_ko,
                tags=tuple(gtags),
                excluded_champion_tags=exc,
                icon_url=icon,
                name_en=name_en,
                description_en=desc_en or None,
            )
        )
    return out


def _load_cdragon_merged_http() -> list[AugmentRecord]:
    with httpx.Client(timeout=35.0) as client:
        re = client.get(CDRAGON_EN)
        re.raise_for_status()
        rk = client.get(CDRAGON_KO)
        rk.raise_for_status()
        merged = _merge_locale_rows(_parse_rows(re.json()), _parse_rows(rk.json()))
    if len(merged) < 15:
        raise ValueError("CDragon merged parse too small")
    return merged


def _load_fallback() -> list[AugmentRecord]:
    from data.aram_catalog import AUGMENTS

    out: list[AugmentRecord] = []
    for a in AUGMENTS:
        gtags = list(a.tags)
        desc_en = a.description_en or a.description
        exc = _excluded_from_tags(gtags + infer_tags_from_description(desc_en, []), a.name, desc_en)
        out.append(
            AugmentRecord(
                a.id,
                a.name,
                a.tier,
                a.description,
                tuple(gtags),
                exc,
                a.icon_url,
                a.name_en or a.name,
                a.description_en or a.description,
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
                    icon_url=x.get("icon_url"),
                    name_en=x.get("name_en"),
                    description_en=x.get("description_en"),
                )
                for x in raw
            ]
            logger.info("Loaded %s augments from disk cache", len(_ENC))
            return _ENC
        except Exception as exc:
            logger.warning("cache invalid: %s", exc)

    try:
        _ENC = _load_cdragon_merged_http()
        try:
            cache_path.write_text(
                json.dumps([asdict(a) for a in _ENC], ensure_ascii=False),
                encoding="utf-8",
            )
        except OSError as exc:
            logger.warning("could not write augment cache: %s", exc)
        logger.info("Loaded %s augments from Community Dragon (en+ko)", len(_ENC))
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


def load_aram_synergy_sets() -> list[dict[str, str]]:
    """아수라장 증강 시너지 요약 (나무위키 정리본)."""
    p = Path(__file__).resolve().parent / "aram_synergy_sets.json"
    if not p.exists():
        return []
    data = json.loads(p.read_text(encoding="utf-8"))
    if isinstance(data, list):
        return [x for x in data if isinstance(x, dict)]
    return []


_SYN_KW_CACHE: dict[str, tuple[str, ...]] | None = None
_SYN_SLUG_TITLE_CACHE: dict[str, str] | None = None


def _synergy_keyword_map() -> dict[str, tuple[str, ...]]:
    global _SYN_KW_CACHE
    if _SYN_KW_CACHE is not None:
        return _SYN_KW_CACHE
    p = Path(__file__).resolve().parent / "augment_synergy_keywords.json"
    if not p.exists():
        _SYN_KW_CACHE = {}
        return _SYN_KW_CACHE
    raw = json.loads(p.read_text(encoding="utf-8"))
    out: dict[str, tuple[str, ...]] = {}
    if isinstance(raw, dict):
        for k, v in raw.items():
            if isinstance(v, list):
                out[str(k)] = tuple(str(x).lower() for x in v if str(x).strip())
    _SYN_KW_CACHE = out
    return _SYN_KW_CACHE


def _synergy_slug_titles() -> dict[str, str]:
    global _SYN_SLUG_TITLE_CACHE
    if _SYN_SLUG_TITLE_CACHE is not None:
        return _SYN_SLUG_TITLE_CACHE
    titles: dict[str, str] = {}
    for row in load_aram_synergy_sets():
        slug = row.get("slug")
        if not slug:
            continue
        titles[str(slug)] = str(row.get("name_ko") or slug)
    _SYN_SLUG_TITLE_CACHE = titles
    return titles


def augment_synergy_sets_for_record(a: AugmentRecord) -> list[dict[str, str]]:
    """이름·설명(한·영)에 시너지 키워드가 들어가면 해당 세트를 붙인다."""
    parts = [a.name, a.description, a.name_en or "", a.description_en or ""]
    hay = " ".join(x for x in parts if x).lower()
    titles = _synergy_slug_titles()
    found: list[dict[str, str]] = []
    seen: set[str] = set()
    for slug, keys in _synergy_keyword_map().items():
        if not keys or not any(k in hay for k in keys):
            continue
        if slug in seen:
            continue
        seen.add(slug)
        found.append({"slug": slug, "name_ko": titles.get(slug, slug)})
    return found
