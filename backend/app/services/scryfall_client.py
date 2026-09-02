from __future__ import annotations

from typing import Any

import httpx

SCRYFALL_API_URL = "https://api.scryfall.com"


class ScryfallClient:
    def __init__(self, base_url: str = SCRYFALL_API_URL, timeout: float = 10.0) -> None:
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout

    def search_cards(self, query: str) -> list[dict[str, Any]]:
        response = httpx.get(
            f"{self.base_url}/cards/search",
            params={"q": query},
            timeout=self.timeout,
        )
        response.raise_for_status()

        payload = response.json()
        return payload.get("data", [])


scryfall_client = ScryfallClient()
