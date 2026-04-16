"""Champion list for autocomplete (backed by same mock data as recommendations)."""

from fastapi import APIRouter, Query

from services.aram_recommendation_service import champion_names_for_prefix

router = APIRouter(tags=["champions"])


@router.get("/champions")
def list_champions(
    prefix: str = Query("", description="Filter champions by name prefix"),
    limit: int = Query(8, ge=1, le=50),
) -> dict:
    """Return champion names for debounced search UI."""
    return {"champions": champion_names_for_prefix(prefix, limit)}
