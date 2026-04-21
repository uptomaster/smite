"""
전체 챔피언 디렉터리 (Data Dragon en_US + ko_KR 병합).
한글·영문 검색 및 API용 영문 표기 이름(name_en) 해석.
"""

from __future__ import annotations

import json
import logging
from dataclasses import asdict, dataclass
from functools import lru_cache
from pathlib import Path
from typing import Any

import httpx

logger = logging.getLogger(__name__)

CACHE_PATH = Path(__file__).resolve().parent / "champion_directory_cache.json"
VERSIONS_URL = "https://ddragon.leagueoflegends.com/api/versions.json"


@dataclass(frozen=True)
class ChampionEntry:
    slug: str
    riot_id: int
    name_en: str
    name_ko: str

    def to_dict(self, image_url: str) -> dict[str, Any]:
        d = asdict(self)
        d["image"] = image_url
        return d


def _placeholder_champion_image(slug: str) -> str:
    """placehold.co는 ASCII만 안전."""
    s = (slug or "?")[:1].upper()
    if not s.isascii():
        s = "?"
    return f"https://placehold.co/48x48/1e293b/a78bfa.png?text={s}"


def _fetch_json(url: str) -> Any:
    with httpx.Client(timeout=35.0) as client:
        r = client.get(url)
        r.raise_for_status()
        return r.json()


def _load_merged_entries() -> list[ChampionEntry]:
    if CACHE_PATH.exists():
        try:
            raw = json.loads(CACHE_PATH.read_text(encoding="utf-8"))
            if isinstance(raw, list) and len(raw) > 50:
                return [
                    ChampionEntry(
                        slug=str(x["slug"]),
                        riot_id=int(x["riot_id"]),
                        name_en=str(x["name_en"]),
                        name_ko=str(x["name_ko"]),
                    )
                    for x in raw
                    if isinstance(x, dict) and "slug" in x
                ]
        except Exception as exc:
            logger.warning("champion cache invalid: %s", exc)

    versions = _fetch_json(VERSIONS_URL)
    if not isinstance(versions, list) or not versions:
        raise ValueError("ddragon versions empty")
    ver = str(versions[0])
    base = f"https://ddragon.leagueoflegends.com/cdn/{ver}/data"
    en = _fetch_json(f"{base}/en_US/champion.json")
    ko = _fetch_json(f"{base}/ko_KR/champion.json")
    en_data = en.get("data") or {}
    ko_data = ko.get("data") or {}
    out: list[ChampionEntry] = []
    for slug, er in en_data.items():
        if not isinstance(er, dict):
            continue
        kr = ko_data.get(slug)
        if not isinstance(kr, dict):
            continue
        try:
            rid = int(er.get("key", 0))
        except (TypeError, ValueError):
            continue
        name_en = str(er.get("name") or slug)
        name_ko = str(kr.get("name") or name_en)
        out.append(ChampionEntry(slug=slug, riot_id=rid, name_en=name_en, name_ko=name_ko))
    out.sort(key=lambda x: x.name_ko)
    try:
        CACHE_PATH.write_text(
            json.dumps([asdict(x) for x in out], ensure_ascii=False),
            encoding="utf-8",
        )
    except OSError as exc:
        logger.warning("champion cache write failed: %s", exc)
    return out


@lru_cache(maxsize=1)
def get_champion_entries() -> tuple[ChampionEntry, ...]:
    return tuple(_load_merged_entries())


@lru_cache(maxsize=1)
def _lookup_maps() -> tuple[dict[str, str], dict[str, str]]:
    """lower_fold -> canonical name_en (표기: Master Yi 등)."""
    en_to: dict[str, str] = {}
    ko_to: dict[str, str] = {}
    for e in get_champion_entries():
        fold = lambda s: s.strip().casefold()
        en_to[fold(e.name_en)] = e.name_en
        ko_to[fold(e.name_ko)] = e.name_en
        en_to[fold(e.slug)] = e.name_en
    return en_to, ko_to


def resolve_champion_api_name(query: str) -> str | None:
    """사용자 입력(한·영)을 추천 API용 영문 표기 이름으로."""
    q = query.strip()
    if not q:
        return None
    f = q.casefold()
    en_map, ko_map = _lookup_maps()
    if f in en_map:
        return en_map[f]
    if f in ko_map:
        return ko_map[f]
    return None


def search_champions(query: str, limit: int = 12) -> list[dict[str, Any]]:
    q = query.strip()
    entries = get_champion_entries()
    if not q:
        return [e.to_dict(_placeholder_champion_image(e.slug)) for e in entries[:limit]]

    f = q.casefold()
    starts: list[ChampionEntry] = []
    contains: list[ChampionEntry] = []
    for e in entries:
        nk = e.name_ko.casefold()
        ne = e.name_en.casefold()
        sl = e.slug.casefold()
        if nk.startswith(f) or ne.startswith(f) or sl.startswith(f):
            starts.append(e)
        elif f in nk or f in ne or f in sl:
            contains.append(e)

    ranked = starts + contains
    seen: set[str] = set()
    uniq: list[ChampionEntry] = []
    for e in ranked:
        if e.slug not in seen:
            seen.add(e.slug)
            uniq.append(e)
        if len(uniq) >= limit:
            break
    return [e.to_dict(_placeholder_champion_image(e.slug)) for e in uniq]


def is_known_champion(query: str) -> bool:
    return resolve_champion_api_name(query) is not None
