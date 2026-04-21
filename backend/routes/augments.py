"""Augment encyclopedia for UI picker (no raw ID typing)."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from data.encyclopedia_loader import (
    augment_synergy_sets_for_record,
    get_augment_encyclopedia,
    load_aram_synergy_sets,
)
from services.aram_recommendation_service import (
    augment_allowed_for_champion,
    champion_exists,
    champion_kit_tags,
    normalize_champion_for_api,
)

router = APIRouter(tags=["augments"])

_TIER_PLACEHOLDER = {"silver": "S", "gold": "G", "prismatic": "P"}


def _dummy_augment_icon(tier: str) -> str:
    t = _TIER_PLACEHOLDER.get(tier, "?")
    return f"https://placehold.co/64x64/0f172a/f472b6.png?text={t}"


@router.get("/augments/synergies")
def list_aram_synergies() -> dict:
    """무작위 총력전: 아수라장 증강 시너지 요약 (정적 데이터)."""
    rows = load_aram_synergy_sets()
    return {"count": len(rows), "synergies": rows}


@router.get("/augments")
def list_augments(
    champion: str | None = Query(
        None,
        description="If set, only augments valid for this champion (restriction filter).",
    ),
) -> dict:
    rows = list(get_augment_encyclopedia())
    if champion:
        if not champion_exists(champion):
            raise HTTPException(status_code=404, detail="Unknown champion")
        api = normalize_champion_for_api(champion)
        if not api:
            raise HTTPException(status_code=404, detail="Unknown champion")
        kit = champion_kit_tags(api)
        rows = [a for a in rows if augment_allowed_for_champion(a, kit)]
    return {
        "count": len(rows),
        "augments": [
            {
                "id": a.id,
                "name": a.name,
                "name_en": a.name_en,
                "description": a.description,
                "tags": list(a.tags),
                "tier": a.tier,
                "icon": _dummy_augment_icon(a.tier),
                "excluded_champion_tags": list(a.excluded_champion_tags),
                "synergy_sets": augment_synergy_sets_for_record(a),
            }
            for a in rows
        ],
    }
