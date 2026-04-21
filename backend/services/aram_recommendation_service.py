"""
ARAM augment decision engine: stats + champion kit + restrictions + selected augments + team context.

final_score =
  base_score * 0.35 + augment_combo * 0.25 + context * 0.25 + strength * 0.15

base_score = winrate * 0.5 + pickrate * 0.5  (from DB when available, else archetype heuristic)
confidence_score = min(1.0, games_played / 5000)
"""

from __future__ import annotations

import json
import re
from pathlib import Path

from config import settings
from data.aram_catalog import AUGMENT_ITEMS, SYNERGY_OVERRIDES, all_augment_tags
from data.champion_directory import resolve_champion_api_name
from data.encyclopedia_loader import augment_by_id, get_augment_encyclopedia
from data.mock_data import CHAMPIONS
from repositories.stats_repository import ChampionAugmentStatRow, champion_augment_stats_map
from services.team_analyzer import situation_labels_ko

TIER_STRENGTH = {"prismatic": 1.0, "gold": 0.72, "silver": 0.52}
STAT_CONFIDENCE_GAMES = 5000


def _strip_html(s: str, max_len: int = 140) -> str:
    t = re.sub(r"<[^>]+>", " ", s)
    t = re.sub(r"\s+", " ", t).strip()
    if len(t) <= max_len:
        return t
    return t[: max_len - 1] + "…"


def _known_champion_names() -> set[str]:
    names = {c.name.lower() for c in CHAMPIONS}
    p = Path(__file__).resolve().parent.parent / "data" / "aram_champion_archetypes.json"
    if p.exists():
        data = json.loads(p.read_text(encoding="utf-8"))
        names |= {k.lower() for k in data.keys()}
    return names


def normalize_champion_for_api(name: str) -> str | None:
    """한글·영문 입력 → 추천/키트 태그용 영문 표기 이름 (예: Ezreal, Master Yi)."""
    s = name.strip()
    if not s:
        return None
    r = resolve_champion_api_name(s)
    if r:
        return r
    low = s.casefold()
    for c in CHAMPIONS:
        if c.name.casefold() == low:
            return c.name
    for k in _load_extra_names():
        if k.casefold() == low:
            return k
    return None


def champion_exists(name: str) -> bool:
    return normalize_champion_for_api(name) is not None


def champion_names_for_prefix(prefix: str, limit: int = 8) -> list[str]:
    """레거시: 영문 접두사. 신규 UI는 /champions?q= 사용."""
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
    """Official-style kit tags: AP, AD, no_mana, no_cc, hybrid, poke, tank, …"""
    path = Path(__file__).resolve().parent.parent / "data" / "champion_kit_tags.json"
    if not path.exists():
        return {"mana_user", "has_cc"}
    data = json.loads(path.read_text(encoding="utf-8"))
    ck = champion_key.strip()
    for k, v in data.items():
        if str(k).casefold() == ck.casefold():
            return set(v)
    return {"mana_user", "has_cc", "hybrid"}


def augment_allowed_for_champion(aug, champ_tags: set[str]) -> bool:
    for ex in aug.excluded_champion_tags:
        if ex in champ_tags:
            return False
    return True


def list_champions_recommended_for_augment(aug) -> list[dict[str, str]]:
    """제한 통과 챔피언 중, 역할(아키타입)·증강 태그 시너지 점수가 높은 순으로 골라 반환."""
    from data.champion_directory import get_champion_entries

    scored: list[tuple[float, dict[str, str]]] = []
    for e in get_champion_entries():
        kit = champion_kit_tags(e.name_en)
        if not augment_allowed_for_champion(aug, kit):
            continue
        key = e.name_en.casefold()
        sc = base_synergy_score(key, aug.id)
        scored.append((sc, {"name_en": e.name_en, "name_ko": e.name_ko}))

    scored.sort(key=lambda x: x[0], reverse=True)
    if not scored:
        return []

    # 점수 컷: 너무 낮은 일반 적합은 제외. 인원이 너무 적으면 상위 N명으로 보완.
    threshold = 0.57
    picked = [row for sc, row in scored if sc >= threshold]
    if len(picked) < 8:
        picked = [row for _, row in scored[:18]]
    elif len(picked) > 26:
        picked = picked[:26]
    return picked


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
    if ("tank" in pool or "anti_burst" in pool) and ("sustain" in cand_tags or "sustain" in pool):
        base = min(1.0, base + 0.12)
    if ("damage" in pool or "scaling" in pool) and ("scaling" in cand_tags or "damage" in cand_tags):
        base = min(1.0, base + 0.08)
    # Stronger synergy as the build grows (official-style combo paths)
    build_boost = 1.0 + 0.08 * min(len(selected_ids), 4)
    return min(1.0, base * build_boost)


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
    if "engage" in enemy_tags and ("anti_burst" in s or "tank" in s):
        m += 0.1
    if "sustain_pressure" in enemy_tags and "anti_poke" in s:
        m += 0.12
    return min(1.0, m)


def augment_strength(tier: str) -> float:
    return TIER_STRENGTH.get(tier, 0.6)


def final_score_v3(
    base_score: float,
    combo: float,
    ctx: float,
    strength: float,
) -> float:
    return base_score * 0.35 + combo * 0.25 + ctx * 0.25 + strength * 0.15


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


def _stats_for_augment(
    row: ChampionAugmentStatRow | None,
    champ_key: str,
    aug_id: int,
) -> tuple[float, float, int, str, str | None]:
    """winrate, pickrate, games_played, source, patch."""
    if row is not None:
        return (
            float(row.winrate),
            float(row.pickrate),
            int(row.games_played),
            "aggregated",
            row.patch_version,
        )
    h = base_synergy_score(champ_key, aug_id)
    return h, h, 0, "estimated", None


def _confidence(games: int) -> float:
    return min(1.0, games / STAT_CONFIDENCE_GAMES)


def _reason_breakdown(
    aug_tags: list[str],
    ally_tags: list[str],
    enemy_tags: list[str],
    selected_ids: list[int],
    wr: float,
    pr: float,
    gp: int,
    source: str,
) -> tuple[str, str, str]:
    syn = "기존 증강과 태그·역할 시너지" if selected_ids else "챔피언 역할·스킬 구조와 맞는 증강"
    ctx_parts: list[str] = []
    if "heavy_poke" in enemy_tags or "poke" in enemy_tags:
        ctx_parts.append("포킹 상대")
    if "low_tank" in ally_tags:
        ctx_parts.append("아군 탱 부족")
    if "high_burst" in enemy_tags:
        ctx_parts.append("폭딜 위협")
    ctx = " · ".join(ctx_parts) if ctx_parts else "현재 조합 밸런스"
    if source == "aggregated":
        stat = f"집계 표본 {gp}게임 — 승률 {wr:.0%}, 픽률 {pr:.0%}"
    else:
        stat = "해당 챔피언 집계 데이터 없음 — 아키타입·태그 기반 추정"
    return syn, ctx, stat


def _anti_reasons(aug_tags: list[str], ally_tags: list[str], enemy_tags: list[str]) -> list[str]:
    out = ["현재 조합·빌드와 비효율적"]
    if "heavy_poke" in enemy_tags and "sustain" not in aug_tags:
        out.append("포킹 환경에서 생존 옵션이 유리")
    if len(out) < 3:
        out.append("기대 시너지가 낮음")
    return out[:3]


def _pick_payload(
    aid: int,
    final_sc: float,
    champ_key: str,
    ally_tags: list[str],
    enemy_tags: list[str],
    selected_ids: list[int],
    stats_map: dict[int, ChampionAugmentStatRow],
) -> dict:
    a = augment_by_id(aid)
    assert a is not None
    tags = all_augment_tags(a)
    row = stats_map.get(aid)
    wr, pr, gp, source, patch = _stats_for_augment(row, champ_key, aid)
    base_score = wr * 0.5 + pr * 0.5
    conf = _confidence(gp)
    combo = augment_combo_score(selected_ids, a)
    ctx = context_match_score(tags, ally_tags, enemy_tags)
    st = augment_strength(a.tier)
    syn_r, ctx_r, stat_r = _reason_breakdown(tags, ally_tags, enemy_tags, selected_ids, wr, pr, gp, source)
    sm, rs = _build_summary_lines(tags, ally_tags, enemy_tags, selected_ids)

    return {
        "augment": a.name,
        "tier": a.tier,
        "description_short": _strip_html(a.description),
        "summary": sm,
        "confidence": round(conf, 4),
        "reasons": rs,
        "reason_breakdown": {"synergy": syn_r, "context": ctx_r, "statistical": stat_r},
        "stats": {
            "winrate": round(wr, 4),
            "pickrate": round(pr, 4),
            "games_played": gp,
            "confidence_score": round(conf, 4),
            "data_source": source,
            "patch_version": patch,
        },
        "score_breakdown": {
            "base_score": round(base_score, 4),
            "augment_combo": round(combo, 4),
            "context": round(ctx, 4),
            "strength": round(st, 4),
            "final_score": round(final_sc, 4),
        },
        "score_bars": {
            "winrate": round(wr, 4),
            "synergy": round(combo, 4),
            "context": round(ctx, 4),
            "confidence": round(conf, 4),
        },
    }


def _build_summary_lines(
    aug_tags: list[str],
    ally_tags: list[str],
    enemy_tags: list[str],
    selected_ids: list[int],
) -> tuple[str, list[str]]:
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
    lines = lines[:4]
    summary = "현재 빌드와 가장 시너지 높음" if selected_ids else "이번 라운드에서 데이터·상황 기준 최선"
    return summary, lines


def recommend_aram(
    champion: str,
    allies_csv: str,
    enemies_csv: str,
    selected_csv: str = "",
) -> dict:
    from services.team_analyzer import analyze_teams

    api_name = normalize_champion_for_api(champion)
    if not api_name:
        raise ValueError("unknown champion")
    champ_key = api_name.casefold()
    kit = champion_kit_tags(api_name)
    allies = _parse_team(allies_csv)
    enemies = _parse_team(enemies_csv)
    catalog = list(get_augment_encyclopedia())
    known_ids = {a.id for a in catalog}
    selected_ids = [x for x in _parse_selected(selected_csv) if x in known_ids]

    if settings.use_mock_recommendations:
        stats_map: dict[int, ChampionAugmentStatRow] = {}
    else:
        stats_map = champion_augment_stats_map(api_name)

    ally_tags, enemy_tags = analyze_teams(allies, enemies)
    situation = situation_labels_ko(ally_tags, enemy_tags)
    if not situation["ally"]:
        situation["ally"] = ["정보 부족 — 아군을 입력하면 정확해져요"]
    if not situation["enemy"]:
        situation["enemy"] = ["정보 부족 — 적군을 입력하면 정확해져요"]

    valid = [a for a in catalog if augment_allowed_for_champion(a, kit)]

    if not valid:
        raise ValueError("no valid augments for champion")

    scored: list[tuple[float, int, float, float, float, float, float]] = []
    for aug in valid:
        if aug.id in selected_ids:
            continue
        tags = all_augment_tags(aug)
        row = stats_map.get(aug.id)
        wr, pr, gp, source, _patch = _stats_for_augment(row, champ_key, aug.id)
        base_score = wr * 0.5 + pr * 0.5
        combo = augment_combo_score(selected_ids, aug)
        ctx = context_match_score(tags, ally_tags, enemy_tags)
        st = augment_strength(aug.tier)
        sc = final_score_v3(base_score, combo, ctx, st)
        scored.append((sc, aug.id, base_score, combo, ctx, st))

    scored.sort(key=lambda x: x[0], reverse=True)
    if not scored:
        raise ValueError("no augments left after selection")

    best_tuple = scored[0]
    best_id = best_tuple[1]
    best = augment_by_id(best_id)
    assert best is not None
    best_tags = all_augment_tags(best)
    summary, reasons = _build_summary_lines(best_tags, ally_tags, enemy_tags, selected_ids)

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

    def pack(aid: int, sc: float) -> dict:
        return _pick_payload(
            aid,
            sc,
            champ_key,
            ally_tags,
            enemy_tags,
            selected_ids,
            stats_map,
        )

    best_pack = pack(best_id, best_tuple[0])

    alternatives: list[dict] = []
    for sc, aid, *_rest in scored[1:5]:
        a = augment_by_id(aid)
        if not a:
            continue
        alt = pack(aid, sc)
        alternatives.append(
            {
                "augment": alt["augment"],
                "tier": alt["tier"],
                "summary": alt["summary"],
                "description_short": alt["description_short"],
                "confidence": alt["confidence"],
                "score": alt["score_breakdown"]["final_score"],
                "reasons": alt["reasons"],
                "reason_breakdown": alt["reason_breakdown"],
                "stats": alt["stats"],
                "score_breakdown": alt["score_breakdown"],
                "score_bars": alt["score_bars"],
                "items": [{"name": n, "reason": r} for n, r in AUGMENT_ITEMS.get(aid, items_raw)[:2]],
            }
        )

    worst = sorted(scored, key=lambda x: x[0])[:16]
    anti_id = worst[0][1]
    if anti_id == best_id and len(worst) > 1:
        anti_id = worst[1][1]
    anti = augment_by_id(anti_id)
    assert anti is not None
    anti_sc = next(x[0] for x in scored if x[1] == anti_id)
    anti_pack = pack(anti_id, anti_sc)

    return {
        "situation": situation,
        "selection_state": {
            "selected": selected_labels,
            "count": len(selected_labels),
        },
        "best_pick": {
            "augment": best_pack["augment"],
            "tier": best_pack["tier"],
            "subtitle": "현재 빌드와 가장 시너지 높음" if selected_ids else "데이터·상황 기준 베스트 픽",
            "summary": summary,
            "description_short": best_pack["description_short"],
            "confidence": best_pack["confidence"],
            "reasons": reasons,
            "reason_breakdown": best_pack["reason_breakdown"],
            "stats": best_pack["stats"],
            "score_breakdown": best_pack["score_breakdown"],
            "score_bars": best_pack["score_bars"],
            "items": items,
        },
        "alternatives": alternatives,
        "anti_pick": {
            "augment": anti.name,
            "reasons": _anti_reasons(all_augment_tags(anti), ally_tags, enemy_tags),
            "stats": anti_pack["stats"],
            "score": anti_pack["score_breakdown"]["final_score"],
        },
        "_cache_tags": {"ally": sorted(ally_tags), "enemy": sorted(enemy_tags), "sel": sorted(selected_ids)},
    }
