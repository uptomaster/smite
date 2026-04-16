"""PostgreSQL connection pool (psycopg v3)."""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING

from config import settings

if TYPE_CHECKING:
    from psycopg_pool import ConnectionPool

logger = logging.getLogger(__name__)

_pool: ConnectionPool | None = None


def init_pool() -> None:
    global _pool
    if _pool is not None or not settings.database_url:
        if not settings.database_url:
            logger.info("DATABASE_URL not set — using in-memory recommendation data.")
        return
    try:
        from psycopg_pool import ConnectionPool

        _pool = ConnectionPool(
            conninfo=settings.database_url,
            min_size=1,
            max_size=10,
            kwargs={"connect_timeout": 5},
        )
        logger.info("PostgreSQL pool ready.")
    except Exception as exc:
        logger.warning("PostgreSQL pool init failed (%s); falling back to mock data.", exc)
        _pool = None


def close_pool() -> None:
    global _pool
    if _pool is not None:
        try:
            _pool.close()
        except Exception as exc:
            logger.warning("Error closing pool: %s", exc)
        _pool = None


def get_pool() -> ConnectionPool | None:
    return _pool
