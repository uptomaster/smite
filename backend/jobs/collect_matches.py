"""
Legacy / optional: Arena match ingestion (playerAugment* fields).
ARAM recommendation in production uses catalog + team analyzer — does NOT use this job.

Batch job: pull Arena (or configured queues) matches from Riot Match-V5,
extract champion + augment picks, store in PostgreSQL, then aggregate stats.

Usage (from backend/):
  set RIOT_API_KEY=...
  set DATABASE_URL=...
  set SEED_PUUIDS=comma,separated,puuids
  python -m jobs.collect_matches
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import sys
from pathlib import Path

import httpx
from dotenv import load_dotenv

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from jobs.augment_catalog import upsert_augments_from_cdragon
from jobs.aggregate_stats import aggregate
from jobs.riot_client import RiotClient


def _load_seed_puuids() -> list[str]:
    raw = os.environ.get("SEED_PUUIDS", "")
    if raw.strip():
        return [p.strip() for p in raw.split(",") if p.strip()]
    path = Path(__file__).resolve().parent.parent / "data" / "seed_puuids.example.json"
    if path.exists():
        data = json.loads(path.read_text(encoding="utf-8"))
        return list(data.get("puuids", []))
    return []


def _parse_augments(participant: dict) -> list[int]:
    """Read playerAugment1..6 from Match-V5 participant DTO."""
    out: list[int] = []
    for i in range(1, 7):
        key = f"playerAugment{i}"
        v = participant.get(key)
        if v is None:
            v = participant.get(key.lower())  # tolerate
        if v and int(v) > 0:
            out.append(int(v))
    return out


def _patch_version(info: dict) -> str:
    return str(info.get("gameVersion") or info.get("game_version") or "unknown")[:32]


def seed_champions(conn) -> None:
    """Ensure champions exist with riot_champion_id for our portfolio set."""
    base = Path(__file__).resolve().parent.parent / "data" / "champion_riot_ids.json"
    if not base.exists():
        return
    mapping = json.loads(base.read_text(encoding="utf-8"))
    with conn.cursor() as cur:
        for name, rid in mapping.items():
            cur.execute(
                """
                INSERT INTO champions (name, riot_champion_id)
                VALUES (%s, %s)
                ON CONFLICT (name) DO UPDATE SET riot_champion_id = EXCLUDED.riot_champion_id
                """,
                (name, int(rid)),
            )
            cur.execute(
                """
                UPDATE champions SET riot_champion_id = %s WHERE LOWER(name) = LOWER(%s) AND riot_champion_id IS NULL
                """,
                (int(rid), name),
            )


def ingest_match(conn, match: dict) -> int:
    """Insert augment fact rows for one match. Returns rows inserted."""
    info = match.get("info") or {}
    mid = str(match.get("metadata", {}).get("matchId") or info.get("gameId") or "")
    patch = _patch_version(info)
    participants = info.get("participants") or []
    n = 0
    with conn.cursor() as cur:
        for p in participants:
            puuid = str(p.get("puuid") or "")
            champ = int(p.get("championId") or 0)
            win = bool(p.get("win"))
            if not puuid or champ <= 0:
                continue
            for aid in _parse_augments(p):
                try:
                    cur.execute(
                        """
                        INSERT INTO match_augment_facts
                            (match_id, participant_puuid, champion_riot_id, augment_riot_id, win, patch_version)
                        VALUES (%s, %s, %s, %s, %s, %s)
                        ON CONFLICT (match_id, participant_puuid, augment_riot_id) DO NOTHING
                        """,
                        (mid, puuid, champ, aid, win, patch),
                    )
                    if cur.rowcount and cur.rowcount > 0:
                        n += 1
                except Exception as exc:
                    logger.debug("skip row: %s", exc)
    return n


def run(
    *,
    count_per_summoner: int = 20,
    queue: int | None = 1700,
) -> None:
    load_dotenv()
    key = os.environ.get("RIOT_API_KEY")
    dsn = os.environ.get("DATABASE_URL")
    if not key or not dsn:
        raise SystemExit("RIOT_API_KEY and DATABASE_URL are required")

    platform = os.environ.get("RIOT_PLATFORM", "euw1")
    regional = os.environ.get("RIOT_REGIONAL", "europe")
    puuids = _load_seed_puuids()
    if not puuids:
        raise SystemExit(
            "No PUUIDs: set SEED_PUUIDS or add data/seed_puuids.example.json (see README in jobs/)."
        )

    client = RiotClient(key, platform, regional)

    import psycopg

    with psycopg.connect(dsn) as conn:
        seed_champions(conn)
        n_aug = upsert_augments_from_cdragon(conn)
        logger.info("Augment catalog upserted: %s rows", n_aug)
        conn.commit()

    total_facts = 0
    for puuid in puuids:
        try:
            ids = client.match_ids_by_puuid(puuid, queue=queue, count=count_per_summoner)
        except httpx.HTTPStatusError as exc:
            logger.warning("match list failed for %s…: %s", puuid[:8], exc)
            continue
        for mid in ids:
            try:
                m = client.match_by_id(mid)
            except httpx.HTTPStatusError as exc:
                logger.warning("match %s failed: %s", mid, exc)
                continue
            with psycopg.connect(dsn) as conn:
                total_facts += ingest_match(conn, m)
                conn.commit()

    logger.info("Ingested augment fact rows (new): ~%s", total_facts)

    with psycopg.connect(dsn) as conn:
        aggregate(conn, None)
        conn.commit()


def main() -> None:
    parser = argparse.ArgumentParser(description="Collect Arena matches from Riot Match-V5")
    parser.add_argument("--count", type=int, default=20, help="Matches per PUUID")
    parser.add_argument("--queue", type=int, default=1700, help="Queue id (1700 = Arena)")
    args = parser.parse_args()
    run(count_per_summoner=args.count, queue=args.queue)


if __name__ == "__main__":
    main()
