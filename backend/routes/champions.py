"""Champion directory for Korean/English search (Data Dragon)."""

from __future__ import annotations

from fastapi import APIRouter, Query

from data.champion_directory import search_champions

router = APIRouter(tags=["champions"])


@router.get("/champions")
def list_champions(
    q: str = Query("", description="한글·영문 검색 (이름 일부)"),
    prefix: str = Query("", description="레거시: q가 비었을 때 대체 검색어"),
    limit: int = Query(500, ge=1, le=500, description="전체 로드 시 500까지"),
) -> dict:
    """검색어에 맞는 챔피언 목록. 검색어가 비어 있으면 가나다순 앞 limit명(기본 전체에 가깝게)."""
    query = (q.strip() or prefix.strip())
    return {"champions": search_champions(query, limit)}
