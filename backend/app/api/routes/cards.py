from fastapi import APIRouter, HTTPException, Query

from app.schemas.card import CardSearchResponse, ScryfallCard
from app.services.scryfall_client import scryfall_client

router = APIRouter(prefix="/cards", tags=["cards"])


@router.get("/search", response_model=CardSearchResponse)
def search_cards(
    q: str = Query(..., min_length=1, description="Card name or search query to look up in Scryfall"),
) -> CardSearchResponse:
    try:
        raw_cards = scryfall_client.search_cards(q)
    except Exception as exc:  # pragma: no cover - surfaced to API caller as a 502
        raise HTTPException(status_code=502, detail=f"Scryfall request failed: {exc}") from exc

    cards = [ScryfallCard.model_validate(card) for card in raw_cards]
    return CardSearchResponse(query=q, total_cards=len(cards), cards=cards)
