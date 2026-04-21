"""
Redis cache for recommendation responses.
Falls back to no-op if Redis is unreachable (service still works).
"""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING

import redis

from config import settings

if TYPE_CHECKING:
    from models.schemas import AramRecommendResponse

logger = logging.getLogger(__name__)

_client: redis.Redis | None = None
_redis_failed = False


def _get_client() -> redis.Redis | None:
    global _client, _redis_failed
    if _redis_failed:
        return None
    if _client is not None:
        return _client
    try:
        _client = redis.from_url(settings.redis_url, decode_responses=True)
        _client.ping()
        return _client
    except redis.RedisError as exc:
        logger.warning("Redis unavailable (%s); continuing without cache.", exc)
        _redis_failed = True
        return None


def cache_get(key: str) -> str | None:
    """Return cached JSON string or None."""
    client = _get_client()
    if not client:
        return None
    try:
        return client.get(key)
    except redis.RedisError as exc:
        logger.warning("Redis get failed: %s", exc)
        return None


def cache_set(key: str, value: str, ttl_seconds: int) -> None:
    client = _get_client()
    if not client:
        return
    try:
        client.setex(key, ttl_seconds, value)
    except redis.RedisError as exc:
        logger.warning("Redis set failed: %s", exc)


def aram_cache_key(champion: str, allies_csv: str, enemies_csv: str, selected_csv: str = "") -> str:
    """Full Redis key: champion + normalized ally/enemy lists + selected augment ids."""

    def norm(s: str) -> str:
        return ",".join(x.strip().lower() for x in s.split(",") if x.strip())

    def norm_ids(s: str) -> str:
        parts: list[str] = []
        for x in s.split(","):
            x = x.strip()
            if not x:
                continue
            try:
                parts.append(str(int(x)))
            except ValueError:
                continue
        return ",".join(sorted(parts))

    return f"aram:v6:{champion.strip().lower()}:{norm(allies_csv)}:{norm(enemies_csv)}:{norm_ids(selected_csv)}"


def aram_serialize(response: AramRecommendResponse) -> str:
    return response.model_dump_json()


def aram_deserialize(raw: str) -> AramRecommendResponse:
    from models.schemas import AramRecommendResponse

    return AramRecommendResponse.model_validate_json(raw)
