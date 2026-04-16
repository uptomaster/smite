"""Thin Riot Games API client (Match-V5, routing-aware)."""

from __future__ import annotations

import logging
from typing import Any

import httpx

logger = logging.getLogger(__name__)


class RiotClient:
    def __init__(self, api_key: str, platform: str, regional: str) -> None:
        self._api_key = api_key
        self._platform = platform
        self._regional = regional
        self._headers = {"X-Riot-Token": api_key}

    def _platform_url(self) -> str:
        return f"https://{self._platform}.api.riotgames.com"

    def _regional_url(self) -> str:
        return f"https://{self._regional}.api.riotgames.com"

    def match_ids_by_puuid(
        self,
        puuid: str,
        *,
        queue: int | None = None,
        count: int = 20,
        start: int = 0,
    ) -> list[str]:
        """lol/match/v5/matches/by-puuid/{puuid}/ids"""
        params: dict[str, Any] = {"start": start, "count": count}
        if queue is not None:
            params["queue"] = queue
        url = f"{self._regional_url()}/lol/match/v5/matches/by-puuid/{puuid}/ids"
        with httpx.Client(timeout=30.0) as client:
            r = client.get(url, headers=self._headers, params=params)
            r.raise_for_status()
            return r.json()

    def match_by_id(self, match_id: str) -> dict[str, Any]:
        """lol/match/v5/matches/{matchId}"""
        url = f"{self._regional_url()}/lol/match/v5/matches/{match_id}"
        with httpx.Client(timeout=30.0) as client:
            r = client.get(url, headers=self._headers)
            r.raise_for_status()
            return r.json()

    def summoner_by_name(self, summoner_name: str) -> dict[str, Any]:
        """lol/summoner/v4/summoners/by-name/{name} (platform host)."""
        from urllib.parse import quote

        enc = quote(summoner_name)
        url = f"{self._platform_url()}/lol/summoner/v4/summoners/by-name/{enc}"
        with httpx.Client(timeout=30.0) as client:
            r = client.get(url, headers=self._headers)
            r.raise_for_status()
            return r.json()
