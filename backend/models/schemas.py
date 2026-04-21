"""Pydantic models for ARAM augment recommendation API."""

from typing import Literal

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


class AugmentStatsBlock(BaseModel):
    """Per-augment statistical payload (DB aggregate or estimated fallback)."""

    winrate: float = Field(..., ge=0.0, le=1.0)
    pickrate: float = Field(..., ge=0.0, le=1.0)
    games_played: int = Field(..., ge=0)
    confidence_score: float = Field(..., ge=0.0, le=1.0)
    data_source: Literal["aggregated", "estimated"] = "estimated"
    patch_version: str | None = None


class ScoreBreakdown(BaseModel):
    """Weighted components (all 0–1) used in final_score."""

    base_score: float
    augment_combo: float
    context: float
    strength: float
    final_score: float


class ScoreBars(BaseModel):
    """Horizontal bar visualization (0–1 each)."""

    winrate: float
    synergy: float
    context: float
    confidence: float


class ReasonBreakdown(BaseModel):
    synergy: str
    context: str
    statistical: str


class BestPick(BaseModel):
    augment: str
    tier: str = Field(..., description="prismatic | gold | silver")
    subtitle: str = ""
    summary: str
    description_short: str = ""
    confidence: float = Field(..., ge=0.0, le=1.0, description="Statistical confidence (games-based)")
    reasons: list[str] = Field(default_factory=list, max_length=6)
    reason_breakdown: ReasonBreakdown
    stats: AugmentStatsBlock
    score_breakdown: ScoreBreakdown
    score_bars: ScoreBars
    items: list[ItemReco] = Field(default_factory=list)


class AlternativePick(BaseModel):
    augment: str
    tier: str
    summary: str
    description_short: str = ""
    confidence: float
    score: float = Field(..., ge=0.0, le=1.0)
    reasons: list[str]
    reason_breakdown: ReasonBreakdown
    stats: AugmentStatsBlock
    score_breakdown: ScoreBreakdown
    score_bars: ScoreBars
    items: list[ItemReco] = Field(default_factory=list)


class AntiPick(BaseModel):
    augment: str
    reasons: list[str]
    stats: AugmentStatsBlock | None = None
    score: float | None = Field(None, ge=0.0, le=1.0)


class AramRecommendResponse(BaseModel):
    """GET /recommend — ARAM decision assistant payload."""

    situation: SituationBlock
    selection_state: SelectionState = Field(default_factory=SelectionState)
    best_pick: BestPick
    alternatives: list[AlternativePick]
    anti_pick: AntiPick


# Legacy alias for cache layer typing
RecommendResponse = AramRecommendResponse
