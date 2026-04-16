"""
In-memory mock data mirroring PostgreSQL tables:
- champions
- augments
- champion_augment (stats + optional per-champion reason)
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

Tier = Literal["prism", "gold", "silver"]


@dataclass(frozen=True)
class ChampionRow:
    id: int
    name: str


@dataclass(frozen=True)
class AugmentRow:
    id: int
    name: str
    tier: Tier
    description: str
    tags: list[str]


@dataclass(frozen=True)
class ChampionAugmentRow:
    id: int
    champion_id: int
    augment_id: int
    winrate: float
    pickrate: float
    trend: float
    reason: str
    games_played: int = 3000  # synthetic sample size for mock confidence when DB is empty


# Static champion list (mock)
CHAMPIONS: list[ChampionRow] = [
    ChampionRow(1, "Ezreal"),
    ChampionRow(2, "Jinx"),
    ChampionRow(3, "Ashe"),
    ChampionRow(4, "Ornn"),
    ChampionRow(5, "Leona"),
    ChampionRow(6, "Shen"),
    ChampionRow(7, "Sylas"),
    ChampionRow(8, "Kassadin"),
    ChampionRow(9, "Karma"),
    ChampionRow(10, "Thresh"),
]

# Augment catalog (tags drive context multipliers: defense, sustain)
AUGMENTS: list[AugmentRow] = [
    AugmentRow(
        1,
        "Ability Haste Boost",
        "prism",
        "Cooldown reduction for faster spell rotations.",
        ["damage", "caster"],
    ),
    AugmentRow(
        2,
        "Fortifying Presence",
        "gold",
        "Grants durability when team fights break out.",
        ["defense", "teamfight"],
    ),
    AugmentRow(
        3,
        "Second Wind Surge",
        "silver",
        "Recovery between trades to stay healthy.",
        ["sustain", "lane"],
    ),
    AugmentRow(
        4,
        "Piercing Intent",
        "prism",
        "Armor penetration and burst damage.",
        ["damage", "carry"],
    ),
    AugmentRow(
        5,
        "Bulwark Protocol",
        "gold",
        "Extra shielding and resistance when focused.",
        ["defense", "peel"],
    ),
    AugmentRow(
        6,
        "Vital Flow",
        "silver",
        "Healing amplification to sustain through poke.",
        ["sustain", "utility"],
    ),
    AugmentRow(
        7,
        "Arcane Tempo",
        "gold",
        "Scaling AP and mana efficiency for long fights.",
        ["damage", "caster"],
    ),
    AugmentRow(
        8,
        "Guardian's Reach",
        "silver",
        "Short-range peel and crowd control.",
        ["defense", "control"],
    ),
    AugmentRow(
        9,
        "Fleet Footwork Echo",
        "prism",
        "Mobility and kiting for skill-shot carries.",
        ["mobility", "carry"],
    ),
    AugmentRow(
        10,
        "Warmth of Dawn",
        "gold",
        "Grants regeneration over time to shrug off harass.",
        ["sustain", "lane"],
    ),
]

# Per-champion-augment stats (mock; would come from DB joins)
CHAMPION_AUGMENT_STATS: list[ChampionAugmentRow] = [
    # Ezreal — poke/carry skew
    ChampionAugmentRow(
        1,
        1,
        1,
        0.58,
        0.31,
        0.72,
        "Improves DPS through cooldown reduction.",
    ),
    ChampionAugmentRow(
        2,
        1,
        4,
        0.55,
        0.28,
        0.68,
        "Amplifies burst damage against squishy targets.",
    ),
    ChampionAugmentRow(
        3,
        1,
        9,
        0.54,
        0.26,
        0.65,
        "Keeps you safe while dodging skillshots.",
    ),
    ChampionAugmentRow(
        4,
        1,
        3,
        0.52,
        0.22,
        0.58,
        "Helps you sustain through long-range poking.",
    ),
    ChampionAugmentRow(
        5,
        1,
        7,
        0.50,
        0.18,
        0.55,
        "Scales mana efficiency for extended poke patterns.",
    ),
    # Jinx
    ChampionAugmentRow(
        6,
        2,
        4,
        0.55,
        0.30,
        0.70,
        "Maximizes crit burst in teamfights.",
    ),
    ChampionAugmentRow(
        7,
        2,
        1,
        0.53,
        0.27,
        0.66,
        "More rockets and traps during chaotic fights.",
    ),
    ChampionAugmentRow(
        8,
        2,
        9,
        0.51,
        0.24,
        0.62,
        "Reposition faster when enemies dive you.",
    ),
    ChampionAugmentRow(
        9,
        2,
        10,
        0.49,
        0.20,
        0.55,
        "Regeneration to shrug off lane harass.",
    ),
    ChampionAugmentRow(
        10,
        2,
        5,
        0.48,
        0.19,
        0.52,
        "Adds peel when you lack a dedicated frontline.",
    ),
    # Ashe
    ChampionAugmentRow(
        11,
        3,
        9,
        0.56,
        0.29,
        0.67,
        "Kiting power to match your slow-focused kit.",
    ),
    ChampionAugmentRow(
        12,
        3,
        4,
        0.54,
        0.26,
        0.64,
        "Pushes damage into your sustained auto attacks.",
    ),
    ChampionAugmentRow(
        13,
        3,
        3,
        0.52,
        0.23,
        0.60,
        "Stays healthy through lane pokes.",
    ),
    ChampionAugmentRow(
        14,
        3,
        7,
        0.50,
        0.21,
        0.57,
        "Utility scaling for long engagements.",
    ),
    # Ornn (tank)
    ChampionAugmentRow(
        15,
        4,
        5,
        0.57,
        0.32,
        0.70,
        "Doubles down on tank durability in teamfights.",
    ),
    ChampionAugmentRow(
        16,
        4,
        2,
        0.58,
        0.31,
        0.72,
        "Frontline anchor for your team.",
    ),
    ChampionAugmentRow(
        17,
        4,
        8,
        0.53,
        0.25,
        0.60,
        "More peel to protect carries.",
    ),
    ChampionAugmentRow(
        36,
        4,
        7,
        0.48,
        0.20,
        0.52,
        "Off-meta AP scaling when your team lacks damage threats.",
    ),
    # Leona
    ChampionAugmentRow(
        18,
        5,
        8,
        0.56,
        0.30,
        0.68,
        "Locks down targets after engagement.",
    ),
    ChampionAugmentRow(
        19,
        5,
        1,
        0.55,
        0.28,
        0.65,
        "Faster rotations on engage combos.",
    ),
    ChampionAugmentRow(
        20,
        5,
        5,
        0.54,
        0.27,
        0.64,
        "Survives focus fire when you go in.",
    ),
    # Shen
    ChampionAugmentRow(
        21,
        6,
        1,
        0.55,
        0.28,
        0.66,
        "More taunts and shields across the map.",
    ),
    ChampionAugmentRow(
        22,
        6,
        7,
        0.54,
        0.26,
        0.63,
        "Global presence with better cooldowns.",
    ),
    ChampionAugmentRow(
        23,
        6,
        8,
        0.53,
        0.25,
        0.61,
        "Zone control for side lane pressure.",
    ),
    # Sylas
    ChampionAugmentRow(
        24,
        7,
        7,
        0.56,
        0.29,
        0.69,
        "Scaling AP for stolen ultimates.",
    ),
    ChampionAugmentRow(
        25,
        7,
        1,
        0.55,
        0.27,
        0.67,
        "Chains spells more often in skirmishes.",
    ),
    ChampionAugmentRow(
        26,
        7,
        4,
        0.52,
        0.24,
        0.60,
        "Balanced damage profile for mixed fights.",
    ),
    # Kassadin
    ChampionAugmentRow(
        27,
        8,
        1,
        0.57,
        0.30,
        0.71,
        "Late-game scaling through cooldown resets.",
    ),
    ChampionAugmentRow(
        28,
        8,
        9,
        0.56,
        0.29,
        0.67,
        "Blink more often to assassinate backlines.",
    ),
    ChampionAugmentRow(
        29,
        8,
        7,
        0.53,
        0.27,
        0.66,
        "Mobility and burst synergy.",
    ),
    # Karma
    ChampionAugmentRow(
        30,
        9,
        6,
        0.55,
        0.28,
        0.68,
        "Amplifies shields and heals for your team.",
    ),
    ChampionAugmentRow(
        31,
        9,
        10,
        0.54,
        0.26,
        0.63,
        "Keeps allies healthy through poke-heavy lanes.",
    ),
    ChampionAugmentRow(
        32,
        9,
        3,
        0.52,
        0.24,
        0.60,
        "Utility scaling for enchanter play.",
    ),
    # Thresh
    ChampionAugmentRow(
        33,
        10,
        8,
        0.56,
        0.30,
        0.69,
        "More hooks and picks for your team.",
    ),
    ChampionAugmentRow(
        34,
        10,
        2,
        0.55,
        0.28,
        0.68,
        "Peel and control in tight corridors.",
    ),
    ChampionAugmentRow(
        35,
        10,
        5,
        0.53,
        0.26,
        0.65,
        "Tankier when you face-check for vision.",
    ),
]