"""Pydantic models for ARAM augment recommendation API."""

from pydantic import BaseModel, Field


class SituationBlock(BaseModel):
    """Localized situation lines for ally / enemy."""

    ally: list[str] = Field(..., description="아군 요약 (한국어)")
    enemy: list[str] = Field(..., description="적군 요약 (한국어)")


class ItemReco(BaseModel):
    name: str
    reason: str


class SelectedAugmentState(BaseModel):
    id: int
    name: str


class SelectionState(BaseModel):
    """Augments already chosen earlier in the ARAM run (multi-round build)."""

    selected: list[SelectedAugmentState] = Field(default_factory=list)
    count: int = 0


class BestPick(BaseModel):
    augment: str
    tier: str = Field(..., description="prismatic | gold | silver")
    subtitle: str = Field(
        default="",
        description="Short line e.g. synergy with current build",
    )
    summary: str
    confidence: float = Field(..., ge=0.0, le=1.0)
    reasons: list[str] = Field(default_factory=list, max_length=5)
    items: list[ItemReco] = Field(default_factory=list)


class AlternativePick(BaseModel):
    augment: str
    tier: str
    summary: str
    confidence: float
    reasons: list[str]
    items: list[ItemReco] = Field(default_factory=list)


class AntiPick(BaseModel):
    augment: str
    reasons: list[str]


class AramRecommendResponse(BaseModel):
    """GET /recommend — ARAM decision assistant payload."""

    situation: SituationBlock
    selection_state: SelectionState = Field(default_factory=SelectionState)
    best_pick: BestPick
    alternatives: list[AlternativePick]
    anti_pick: AntiPick


# Legacy alias for cache layer typing
RecommendResponse = AramRecommendResponse
