from pydantic import BaseModel, Field


class ScryfallCard(BaseModel):
    id: str
    name: str
    mana_cost: str | None = None
    type_line: str | None = None
    oracle_text: str | None = None
    set_name: str | None = None
    collector_number: str | None = None
    image_uris: dict[str, str] | None = None
    prices: dict[str, str | None] | None = None

    model_config = {
        "from_attributes": True,
    }


class CardSearchResponse(BaseModel):
    query: str
    total_cards: int = Field(default=0, ge=0)
    cards: list[ScryfallCard] = []
