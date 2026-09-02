from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.deck import Deck
from app.models.deck_card import DeckCard
from app.schemas.deck import DeckCardCreate, DeckCreate, DeckRead, DeckUpdate

router = APIRouter(prefix="/decks", tags=["decks"])


@router.get("", response_model=list[DeckRead])
def list_decks(db: Session = Depends(get_db)) -> list[Deck]:
    decks = db.query(Deck).all()
    return decks


@router.post("", response_model=DeckRead, status_code=status.HTTP_201_CREATED)
def create_deck(deck: DeckCreate, db: Session = Depends(get_db)) -> Deck:
    db_deck = Deck(
        name=deck.name,
        format=deck.format,
        description=deck.description,
    )
    db.add(db_deck)
    db.commit()
    db.refresh(db_deck)
    return db_deck


@router.get("/{deck_id}", response_model=DeckRead)
def get_deck(deck_id: int, db: Session = Depends(get_db)) -> Deck:
    deck = db.query(Deck).filter(Deck.id == deck_id).first()
    if deck is None:
        raise HTTPException(status_code=404, detail="Deck not found")
    return deck


@router.put("/{deck_id}", response_model=DeckRead)
def update_deck(deck_id: int, deck_update: DeckUpdate, db: Session = Depends(get_db)) -> Deck:
    deck = db.query(Deck).filter(Deck.id == deck_id).first()
    if deck is None:
        raise HTTPException(status_code=404, detail="Deck not found")

    if deck_update.name is not None:
        deck.name = deck_update.name
    if deck_update.format is not None:
        deck.format = deck_update.format
    if deck_update.description is not None:
        deck.description = deck_update.description
    if deck_update.has_commander is not None:
        deck.has_commander = deck_update.has_commander
        # If disabling commander, clear the commander_scryfall_id
        if not deck_update.has_commander:
            deck.commander_scryfall_id = None
    if deck_update.commander_scryfall_id is not None:
        # Only set commander if has_commander is True
        if deck.has_commander:
            deck.commander_scryfall_id = deck_update.commander_scryfall_id

    db.commit()
    db.refresh(deck)
    return deck


@router.post("/{deck_id}/cards", response_model=DeckRead, status_code=status.HTTP_201_CREATED)
def add_card_to_deck(deck_id: int, card: DeckCardCreate, db: Session = Depends(get_db)) -> Deck:
    deck = db.query(Deck).filter(Deck.id == deck_id).first()
    if deck is None:
        raise HTTPException(status_code=404, detail="Deck not found")

    existing = (
        db.query(DeckCard)
        .filter(DeckCard.deck_id == deck_id, DeckCard.scryfall_id == card.scryfall_id)
        .first()
    )

    if existing is not None:
        existing.quantity += card.quantity
    else:
        db_card = DeckCard(
            deck_id=deck_id,
            scryfall_id=card.scryfall_id,
            name=card.name,
            quantity=card.quantity,
            mana_cost=card.mana_cost,
            type_line=card.type_line,
            set_name=card.set_name,
            collector_number=card.collector_number,
            notes=card.notes,
        )
        db.add(db_card)

    db.commit()
    db.refresh(deck)
    return deck


@router.delete("/{deck_id}/cards/{scryfall_id}", response_model=DeckRead)
def remove_card_from_deck(deck_id: int, scryfall_id: str, db: Session = Depends(get_db)) -> Deck:
    deck = db.query(Deck).filter(Deck.id == deck_id).first()
    if deck is None:
        raise HTTPException(status_code=404, detail="Deck not found")

    card = (
        db.query(DeckCard)
        .filter(DeckCard.deck_id == deck_id, DeckCard.scryfall_id == scryfall_id)
        .first()
    )
    if card is None:
        raise HTTPException(status_code=404, detail="Card not found in deck")

    db.delete(card)
    db.commit()
    db.refresh(deck)
    return deck


@router.post("/{deck_id}/commander/{scryfall_id}", response_model=DeckRead)
def set_commander(deck_id: int, scryfall_id: str, db: Session = Depends(get_db)) -> Deck:
    deck = db.query(Deck).filter(Deck.id == deck_id).first()
    if deck is None:
        raise HTTPException(status_code=404, detail="Deck not found")

    if not deck.has_commander:
        raise HTTPException(status_code=400, detail="Deck does not have commander enabled")

    # Verify card exists in deck
    card = (
        db.query(DeckCard)
        .filter(DeckCard.deck_id == deck_id, DeckCard.scryfall_id == scryfall_id)
        .first()
    )
    if card is None:
        raise HTTPException(status_code=404, detail="Card not found in deck")

    deck.commander_scryfall_id = scryfall_id
    db.commit()
    db.refresh(deck)
    return deck


@router.delete("/{deck_id}/commander", response_model=DeckRead)
def unset_commander(deck_id: int, db: Session = Depends(get_db)) -> Deck:
    deck = db.query(Deck).filter(Deck.id == deck_id).first()
    if deck is None:
        raise HTTPException(status_code=404, detail="Deck not found")

    deck.commander_scryfall_id = None
    db.commit()
    db.refresh(deck)
    return deck


@router.delete("/{deck_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_deck(deck_id: int, db: Session = Depends(get_db)) -> None:
    deck = db.query(Deck).filter(Deck.id == deck_id).first()
    if deck is None:
        raise HTTPException(status_code=404, detail="Deck not found")

    db.delete(deck)
    db.commit()
    return None
