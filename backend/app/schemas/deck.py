from datetime import datetime

from pydantic import BaseModel, Field


class DeckCardBase(BaseModel):
    scryfall_id: str
    name: str
    quantity: int = Field(default=1, ge=1)
    mana_cost: str | None = None
    type_line: str | None = None
    set_name: str | None = None
    collector_number: str | None = None
    notes: str | None = None


class DeckCardCreate(DeckCardBase):
    pass


class DeckCardRead(DeckCardBase):
    id: int


class DeckCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    format: str = Field(default="Commander", min_length=1, max_length=100)
    description: str | None = None


class DeckUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    format: str | None = Field(default=None, min_length=1, max_length=100)
    description: str | None = None
    has_commander: bool | None = None
    commander_scryfall_id: str | None = None


class DeckRead(BaseModel):
    id: int
    name: str
    format: str
    description: str | None = None
    has_commander: bool = True
    commander_scryfall_id: str | None = None
    created_at: datetime
    updated_at: datetime
    cards: list[DeckCardRead] = []

    model_config = {
        "from_attributes": True,
    }
