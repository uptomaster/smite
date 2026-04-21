"""
ARAM augment encyclopedia + synergy seeds + item hooks (in-memory; mirrors SQL tables).

Augment tags use: damage, sustain, anti_poke, anti_burst, tank, scaling, utility
(+ optional extra tags for heuristics: poke, cc, marksman, mage, assassin)
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

Tier = Literal["prismatic", "gold", "silver"]


@dataclass(frozen=True)
class AugmentRecord:
    id: int
    name: str
    tier: Tier
    description: str
    tags: tuple[str, ...]
    # If champion has any of these kit tags, this augment must not be offered (mirrors augment_restrictions SQL)
    excluded_champion_tags: tuple[str, ...] = ()
    # Community Dragon asset URL when available
    icon_url: str | None = None
    # English strings from CDragon (tag/heuristic inference; search)
    name_en: str | None = None
    description_en: str | None = None


# Keyword inference (if tags empty in DB) — applied at load time for records without tags
_TAG_KEYWORDS: list[tuple[str, tuple[str, ...]]] = [
    ("heal", ("sustain", "utility")),
    ("omnivamp", ("sustain", "damage")),
    ("lifesteal", ("sustain", "damage")),
    ("shield", ("tank", "anti_burst")),
    ("armor", ("tank", "anti_burst")),
    ("resistance", ("tank", "anti_burst")),
    ("hp", ("tank", "sustain")),
    ("poke", ("anti_poke", "damage")),
    ("range", ("anti_poke", "utility")),
    ("burst", ("damage", "anti_burst")),
    ("execute", ("damage",)),
    ("gold", ("scaling", "utility")),
    ("haste", ("damage", "utility")),
    ("slow", ("utility", "anti_poke")),
    ("tenacity", ("anti_burst", "tank")),
]


def infer_tags_from_description(description: str, base: list[str] | None = None) -> list[str]:
    """Merge explicit tags with keyword-inferred tags."""
    d = description.lower()
    out = list(base or [])
    for needle, add in _TAG_KEYWORDS:
        if needle in d:
            out.extend(add)
    # de-dupe
    seen: set[str] = set()
    uniq: list[str] = []
    for t in out:
        if t not in seen:
            seen.add(t)
            uniq.append(t)
    return uniq


AUGMENTS: list[AugmentRecord] = [
    AugmentRecord(1, "Executioner's Calling Card", "prismatic", "Bonus damage against low-health targets.", ("damage", "scaling")),
    AugmentRecord(2, "Warmth of the Forge", "gold", "Periodic shields and bonus resistances.", ("tank", "anti_burst")),
    AugmentRecord(3, "Second Wind Protocol", "silver", "Healing after trades and better regen.", ("sustain", "anti_poke")),
    AugmentRecord(4, "Arcane Comet Echo", "prismatic", "Spell damage procs and poke amplification.", ("damage", "scaling")),
    AugmentRecord(5, "Guardian Shell", "gold", "Stronger shields on yourself and allies.", ("tank", "utility", "anti_burst")),
    AugmentRecord(6, "Vampiric Thirst", "silver", "Omnivamp and healing from damage dealt.", ("sustain", "damage")),
    AugmentRecord(7, "Piercing Intent", "prismatic", "Armor pen and crit synergy for carries.", ("damage", "scaling")),
    AugmentRecord(8, "Bulwark March", "gold", "Slow resistance and bonus HP.", ("tank", "anti_burst")),
    AugmentRecord(9, "Fleet Tempo", "silver", "Move speed and kiting power.", ("utility", "anti_poke")),
    AugmentRecord(10, "Catalyst Surge", "gold", "Mana and HP sustain in long fights.", ("sustain", "scaling")),
    AugmentRecord(11, "Aftershock Lite", "silver", "Short CC windows grant defensive stats.", ("tank", "cc")),
    AugmentRecord(12, "Infernal Spark", "prismatic", "Burst magic damage on rotation.", ("damage", "burst")),
    AugmentRecord(13, "Glacial Snare", "gold", "Slows and anti-chase tools.", ("utility", "anti_poke")),
    AugmentRecord(14, "Titan's Grasp", "silver", "Grasp-style max HP damage.", ("tank", "damage")),
    AugmentRecord(15, "Echoing Strike", "prismatic", "Double proc on abilities for assassins.", ("damage", "burst")),
    AugmentRecord(16, "Sanctuary", "gold", "Area denial and peel for backline.", ("utility", "anti_burst")),
    AugmentRecord(17, "Rune Harvest", "silver", "Scaling AP and ability haste over time.", ("scaling", "damage")),
    AugmentRecord(18, "Bramble Heart", "gold", "Reflect damage and anti-heal.", ("tank", "anti_burst")),
    AugmentRecord(19, "Cloud Drift", "silver", "Cooldown reduction clouds.", ("utility", "scaling")),
    AugmentRecord(20, "Dawnbringer", "prismatic", "Massive heal on timer for team sustain.", ("sustain", "utility")),
    AugmentRecord(21, "Shadow Dagger", "gold", "Lethality and assassination windows.", ("damage", "burst")),
    AugmentRecord(22, "Aegis Line", "silver", "Flat damage reduction vs single-target burst.", ("anti_burst", "tank")),
    AugmentRecord(23, "Starlit Grace", "gold", "Enchanter-style buffs and shields.", ("utility", "sustain")),
    AugmentRecord(24, "Siegebreaker", "prismatic", "Structure damage and poke amplification.", ("damage", "anti_poke")),
]

# augment_id -> list of (item_name, reason_ko)
AUGMENT_ITEMS: dict[int, list[tuple[str, str]]] = {
    1: [("도미닉 상의의 인사", "체력 낮은 적 처형"), ("징수의 콜렉터", "피니시 딜")],
    2: [("태양의 썰매 방패", "방패로 순간 버티기"), ("강철심장", "체력·저항")],
    3: [("불멸의 철갑궁", "지속 교전 회복"), ("정령의 형상", "마나·체력 유지")],
    4: [("라바돈의 죽음모자", "주문력 스케일"), ("존야의 모래시계", "생존 타이밍")],
    5: [("강철의 솔라리 펜던트", "팀 실드"), ("기사의 맹세", "보호막 강화")],
    6: [("피바라기", "흡혈·교전"), ("굶주린 히드라", "옴니뱀프")],
    7: [("징수의 콜렉터", "치명타·관통"), ("무한의 대검", "폭딜")],
    8: [("가시 갑옷", "탱·반사"), ("자연의 힘", "저항")],
    9: [("신속의 장화", "이속"), ("징검다리", "끊기")],
    10: [("얼어붙은 건틀릿", "체력·마나"), ("대천사의 지팡이", "마나 지속")],
    20: [("불타는 향로", "팀 힐"), ("흐르는 물의 지팡이", "회복 증폭")],
    22: [("가시 갑옷", "폭딜 완화"), ("망자의 갑옷", "체력")],
}

# Partial explicit synergy champion_name(lower) -> augment_id -> base_score (rest filled by heuristic)
SYNERGY_OVERRIDES: dict[str, dict[int, float]] = {
    "ezreal": {4: 0.92, 7: 0.88, 9: 0.85, 17: 0.82},
    "karma": {20: 0.9, 23: 0.88, 3: 0.85},
    "ornn": {2: 0.94, 8: 0.9, 18: 0.88},
    "kassadin": {15: 0.93, 17: 0.9, 12: 0.86},
}


def all_augment_tags(a: AugmentRecord) -> list[str]:
    desc_src = a.description_en if a.description_en else a.description
    merged = infer_tags_from_description(desc_src, list(a.tags))
    return merged
