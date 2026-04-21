"""
Team composition analyzer for ARAM: ally/enemy champion lists → strategic tags.

Merges aram_champion_archetypes.json with champion_kit_tags.json playstyle tags
(poke, tank, sustain, burst, engage) for better context scoring.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

# Internal tag keys (stable for caching & scoring)
AllyTag = str
EnemyTag = str

_PLAYSTYLE = frozenset({"poke", "tank", "sustain", "burst", "engage"})


def _load_archetypes() -> dict[str, list[str]]:
    base = Path(__file__).resolve().parent.parent / "data" / "aram_champion_archetypes.json"
    if not base.exists():
        return {}
    data: dict[str, Any] = json.loads(base.read_text(encoding="utf-8"))
    return {k.lower(): [t.lower() for t in v] for k, v in data.items()}


def _load_kit_tags() -> dict[str, list[str]]:
    p = Path(__file__).resolve().parent.parent / "data" / "champion_kit_tags.json"
    if not p.exists():
        return {}
    raw = json.loads(p.read_text(encoding="utf-8"))
    return {k.lower(): [str(t).lower() for t in v] for k, v in raw.items()}


ARCHETYPES: dict[str, list[str]] = _load_archetypes()
KIT_TAGS: dict[str, list[str]] = _load_kit_tags()


def _tags_for_name(name: str) -> list[str]:
    n = name.strip().lower()
    base = list(ARCHETYPES.get(n, ["utility"]))
    kit = KIT_TAGS.get(n, [])
    seen = set(base)
    out = list(base)
    for t in kit:
        if t == "tank_kit":
            tnorm = "tank"
        else:
            tnorm = t
        if tnorm in _PLAYSTYLE and tnorm not in seen:
            seen.add(tnorm)
            out.append(tnorm)
    return out


def _count_champions_with_tag(names: list[str], tag: str) -> int:
    n = 0
    for raw in names:
        if not raw.strip():
            continue
        if tag in _tags_for_name(raw):
            n += 1
    return n


def _any_tank(names: list[str]) -> bool:
    for raw in names:
        if not raw.strip():
            continue
        tags = _tags_for_name(raw)
        if "tank" in tags:
            return True
    return False


def analyze_teams(ally_champions: list[str], enemy_champions: list[str]) -> tuple[list[AllyTag], list[EnemyTag]]:
    """
    Rules:
    - 3+ poke champions → heavy_poke (enemy team)
    - ally team with no tank champion → low_tank
    - 2+ poke champions on a side → poke (lighter tag)
    - 2+ sustain champions → sustain (ally)
    - 2+ assassins on enemy → high_burst
    - 2+ engage/tank on enemy → engage pressure
    """
    ally_tags: list[AllyTag] = []
    enemy_tags: list[EnemyTag] = []

    if len([n for n in ally_champions if n.strip()]) > 0 and not _any_tank(ally_champions):
        ally_tags.append("low_tank")

    ap = _count_champions_with_tag(ally_champions, "poke")
    if ap >= 2:
        ally_tags.append("poke")
    if _count_champions_with_tag(ally_champions, "sustain") >= 2:
        ally_tags.append("sustain")

    ep = _count_champions_with_tag(enemy_champions, "poke")
    if ep >= 3:
        enemy_tags.append("heavy_poke")
    elif ep >= 2:
        enemy_tags.append("poke")
    if _count_champions_with_tag(enemy_champions, "assassin") >= 2:
        enemy_tags.append("high_burst")
    if _count_champions_with_tag(enemy_champions, "sustain") >= 2:
        enemy_tags.append("sustain_pressure")
    if _count_champions_with_tag(enemy_champions, "engage") >= 2:
        enemy_tags.append("engage")

    return ally_tags, enemy_tags


def situation_labels_ko(ally_tags: list[AllyTag], enemy_tags: list[EnemyTag]) -> dict[str, list[str]]:
    """Human-readable lines for API `situation` block."""
    ally_map = {
        "low_tank": "탱커 부족",
        "poke": "포킹 조합",
        "sustain": "지속·회복 중심",
    }
    enemy_map = {
        "heavy_poke": "포킹 강함",
        "poke": "포킹",
        "high_burst": "폭딜 존재",
        "sustain_pressure": "회복 압박",
        "engage": "강한 진입",
    }
    return {
        "ally": [ally_map[t] for t in ally_tags if t in ally_map],
        "enemy": [enemy_map[t] for t in enemy_tags if t in enemy_map],
    }
