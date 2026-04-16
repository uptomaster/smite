"""ARAM augment recommendation API."""

from fastapi import APIRouter, HTTPException, Query

from config import settings
from models.schemas import AramRecommendResponse
from services.aram_recommendation_service import champion_exists, recommend_aram
from services.cache_service import aram_cache_key, aram_deserialize, aram_serialize, cache_get, cache_set

router = APIRouter(tags=["recommend"])


@router.get("/recommend", response_model=AramRecommendResponse)
def get_recommendations(
    champion: str = Query(..., min_length=1, description="Your champion (ARAM)"),
    allies: str = Query("", description="Comma-separated ally champions"),
    enemies: str = Query("", description="Comma-separated enemy champions"),
    selected: str = Query(
        "",
        description="Comma-separated augment IDs already chosen (build path over rounds)",
    ),
) -> AramRecommendResponse:
    """
    Real-time ARAM augment decision: composition-aware best pick, alternatives, anti-pick.
    Cached on champion + ally/enemy + selected augment IDs (~60s).
    """
    if not champion_exists(champion):
        raise HTTPException(status_code=404, detail="Unknown champion")

    key = aram_cache_key(champion, allies, enemies, selected)
    cached = cache_get(key)
    if cached:
        return aram_deserialize(cached)

    raw = recommend_aram(champion, allies, enemies, selected)
    raw.pop("_cache_tags", None)
    body = AramRecommendResponse.model_validate(raw)
    cache_set(key, aram_serialize(body), settings.cache_ttl_seconds)
    return body
