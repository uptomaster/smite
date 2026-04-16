"""
ARAM augment decision engine: champion kit + restrictions + selected augments + team context.
Scoring: base_synergy*0.35 + augment_combo*0.25 + context_match*0.25 + strength*0.15
"""

from __future__ import annotations

import json
from pathlib import Path

from data.aram_catalog import AUGMENT_ITEMS, SYNERGY_OVERRIDES, all_augment_tags
from data.encyclopedia_loader import augment_by_id, get_augment_encyclopedia
from data.mock_data import CHAMPIONS
from services.team_analyzer import situation_labels_ko

TIER_STRENGTH = {"prismatic": 1.0, "gold": 0.72, "silver": 0.52}


def _known_champion_names() -> set[str]:
    names = {c.name.lower() for c in CHAMPIONS}
    p = Path(__file__).resolve().parent.parent / "data" / "aram_champion_archetypes.json"
    if p.exists():
        data = json.loads(p.read_text(encoding="utf-8"))
        names |= {k.lower() for k in data.keys()}
    return names


def champion_exists(name: str) -> bool:
    return name.strip().lower() in _known_champion_names()


def champion_names_for_prefix(prefix: str, limit: int = 8) -> list[str]:
    p = prefix.strip().lower()
    all_names = sorted({c.name for c in CHAMPIONS} | _load_extra_names())
    if not p:
        return all_names[:limit]
    return [n for n in all_names if n.lower().startswith(p)][:limit]


def _load_extra_names() -> set[str]:
    p = Path(__file__).resolve().parent.parent / "data" / "aram_champion_archetypes.json"
    if not p.exists():
        return set()
    return set(json.loads(p.read_text(encoding="utf-8")).keys())


def champion_kit_tags(champion_key: str) -> set[str]:
    """Official-style kit tags: AP, AD, no_mana, no_cc, hybrid, etc."""
    path = Path(__file__).resolve().parent.parent / "data" / "champion_kit_tags.json"
    if not path.exists():
        return {"mana_user", "has_cc"}
    data = json.loads(path.read_text(encoding="utf-8"))
    tags = data.get(champion_key.lower()) or data.get(champion_key)
    if not tags:
        return {"mana_user", "has_cc", "hybrid"}
    return set(tags)


def augment_allowed_for_champion(aug, champ_tags: set[str]) -> bool:
    """Filter augments that must not appear for this champion (restrictions)."""
    for ex in aug.excluded_champion_tags:
        if ex in champ_tags:
            return False
    return True


def augment_combo_score(selected_ids: list[int], candidate) -> float:
    """How well the candidate synergizes with already chosen augments (0~1)."""
    if not selected_ids:
        return 0.55
    pool: set[str] = set()
    for sid in selected_ids:
        sa = augment_by_id(sid)
        if sa:
            pool |= set(all_augment_tags(sa))
    cand_tags = set(all_augment_tags(candidate))
    if not pool:
        return 0.55
    overlap = len(pool & cand_tags)
    base = 0.28 + 0.62 * min(1.0, overlap / max(4, len(cand_tags)))
    # Complementary pairs
    if ("tank" in pool or "anti_burst" in pool) and ("sustain" in cand_tags or "sustain" in pool):
        base = min(1.0, base + 0.12)
    if ("damage" in pool or "scaling" in pool) and ("scaling" in cand_tags or "damage" in cand_tags):
        base = min(1.0, base + 0.08)
    return min(1.0, base)


def _heuristic_base_synergy(champion_key: str, aug_id: int) -> float:
    path = Path(__file__).resolve().parent.parent / "data" / "aram_champion_archetypes.json"
    arch: dict[str, list[str]] = {}
    if path.exists():
        raw = json.loads(path.read_text(encoding="utf-8"))
        arch = {k.lower(): [t.lower() for t in v] for k, v in raw.items()}
    ct = set(arch.get(champion_key, ["utility"]))
    aug = augment_by_id(aug_id)
    if not aug:
        return 0.4
    at = set(all_augment_tags(aug))
    overlap = len(ct & at)
    return min(1.0, 0.4 + 0.55 * min(1.0, overlap / max(len(ct), 1)))


def base_synergy_score(champion_key: str, aug_id: int) -> float:
    ovr = SYNERGY_OVERRIDES.get(champion_key, {}).get(aug_id)
    if ovr is not None:
        return ovr
    return _heuristic_base_synergy(champion_key, aug_id)


def context_match_score(aug_tags: list[str], ally_tags: list[str], enemy_tags: list[str]) -> float:
    s = set(aug_tags)
    m = 0.0
    if "heavy_poke" in enemy_tags or "poke" in enemy_tags:
        if "sustain" in s:
            m += 0.3
        if "anti_poke" in s:
            m += 0.25
    if "low_tank" in ally_tags:
        if "tank" in s:
            m += 0.25
    if "high_burst" in enemy_tags:
        if "anti_burst" in s:
            m += 0.2
        if "tank" in s:
            m += 0.15
    if "sustain_pressure" in enemy_tags and "anti_poke" in s:
        m += 0.12
    return min(1.0, m)


def augment_strength(tier: str) -> float:
    return TIER_STRENGTH.get(tier, 0.6)


def final_score_v2(base: float, combo: float, ctx: float, strength: float) -> float:
    return base * 0.35 + combo * 0.25 + ctx * 0.25 + strength * 0.15


def _parse_team(s: str) -> list[str]:
    if not s.strip():
        return []
    return [x.strip() for x in s.split(",") if x.strip()]


def _parse_selected(s: str) -> list[int]:
    if not s.strip():
        return []
    out: list[int] = []
    for x in s.split(","):
        x = x.strip()
        if not x:
            continue
        try:
            out.append(int(x))
        except ValueError:
            continue
    return out


def _build_explanations(
    aug_tags: list[str],
    ally_tags: list[str],
    enemy_tags: list[str],
    selected_ids: list[int],
    champ_key: str,
) -> tuple[str, list[str]]:
    """Summary + three system-faithful reason lines."""
    lines: list[str] = []
    if selected_ids:
        lines.append("기존 증강과 시너지")
    if ("heavy_poke" in enemy_tags or "poke" in enemy_tags) and (
        "sustain" in aug_tags or "anti_poke" in aug_tags
    ):
        lines.append("포킹 대응")
    if "low_tank" in ally_tags and "tank" in aug_tags:
        lines.append("아군 탱 부족 보완")
    lines.append("챔피언 스킬 구조와 일치")
    lines = lines[:3]
    summary = "현재 빌드와 가장 시너지 높음" if selected_ids else "이번 라운드에서 가장 안전한 픽"
    return summary, lines


def _anti_reasons(aug_tags: list[str], ally_tags: list[str], enemy_tags: list[str]) -> list[str]:
    out = ["현재 조합·빌드와 비효율적"]
    if "heavy_poke" in enemy_tags and "sustain" not in aug_tags:
        out.append("포킹 환경에서 생존 옵션이 유리")
    if len(out) < 3:
        out.append("기대 시너지가 낮음")
    return out[:3]


def recommend_aram(
    champion: str,
    allies_csv: str,
    enemies_csv: str,
    selected_csv: str = "",
) -> dict:
    from services.team_analyzer import analyze_teams

    champ_key = champion.strip().lower()
    kit = champion_kit_tags(champ_key)
    allies = _parse_team(allies_csv)
    enemies = _parse_team(enemies_csv)
    catalog = list(get_augment_encyclopedia())
    known_ids = {a.id for a in catalog}
    selected_ids = [x for x in _parse_selected(selected_csv) if x in known_ids]

    ally_tags, enemy_tags = analyze_teams(allies, enemies)
    situation = situation_labels_ko(ally_tags, enemy_tags)
    if not situation["ally"]:
        situation["ally"] = ["정보 부족 — 아군을 입력하면 정확해져요"]
    if not situation["enemy"]:
        situation["enemy"] = ["정보 부족 — 적군을 입력하면 정확해져요"]

    valid = [a for a in catalog if augment_allowed_for_champion(a, kit)]

    if not valid:
        raise ValueError("no valid augments for champion")

    scored: list[tuple[float, int]] = []
    for aug in valid:
        if aug.id in selected_ids:
            continue
        tags = all_augment_tags(aug)
        bs = base_synergy_score(champ_key, aug.id)
        cm = context_match_score(tags, ally_tags, enemy_tags)
        combo = augment_combo_score(selected_ids, aug)
        st = augment_strength(aug.tier)
        sc = final_score_v2(bs, combo, cm, st)
        scored.append((sc, aug.id))

    scored.sort(key=lambda x: x[0], reverse=True)
    if not scored:
        raise ValueError("no augments left after selection")

    best_id = scored[0][1]
    best = augment_by_id(best_id)
    assert best is not None
    best_tags = all_augment_tags(best)
    summary, reasons = _build_explanations(best_tags, ally_tags, enemy_tags, selected_ids, champ_key)
    best_conf = round(min(1.0, scored[0][0] + 0.06), 2)

    items_raw = AUGMENT_ITEMS.get(
        best.id,
        [("적응형 투구", "상황 방어"), ("신속의 장화", "포지셔닝")],
    )
    items: list[dict[str, str]] = [{"name": n, "reason": r} for n, r in items_raw[:4]]

    selected_labels = []
    for sid in selected_ids:
        sa = augment_by_id(sid)
        if sa:
            selected_labels.append({"id": sa.id, "name": sa.name})

    alternatives = []
    for sc, aid in scored[1:3]:
        a = augment_by_id(aid)
        if not a:
            continue
        tgs = all_augment_tags(a)
        sm, rs = _build_explanations(tgs, ally_tags, enemy_tags, selected_ids, champ_key)
        alternatives.append(
            {
                "augment": a.name,
                "tier": a.tier,
                "summary": sm,
                "confidence": round(min(1.0, sc + 0.04), 2),
                "reasons": rs,
                "items": [{"name": n, "reason": r} for n, r in AUGMENT_ITEMS.get(aid, items_raw)[:2]],
            }
        )

    worst = sorted(scored, key=lambda x: x[0])[:12]
    anti_id = worst[0][1]
    if anti_id == best_id and len(worst) > 1:
        anti_id = worst[1][1]
    anti = augment_by_id(anti_id)
    assert anti is not None

    return {
        "situation": situation,
        "selection_state": {
            "selected": selected_labels,
            "count": len(selected_labels),
        },
        "best_pick": {
            "augment": best.name,
            "tier": best.tier,
            "subtitle": "현재 빌드와 가장 시너지 높음",
            "summary": summary,
            "confidence": best_conf,
            "reasons": reasons,
            "items": items,
        },
        "alternatives": alternatives,
        "anti_pick": {
            "augment": anti.name,
            "reasons": _anti_reasons(all_augment_tags(anti), ally_tags, enemy_tags),
        },
        "_cache_tags": {"ally": sorted(ally_tags), "enemy": sorted(enemy_tags), "sel": sorted(selected_ids)},
    }
