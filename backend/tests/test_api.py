import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import Base, get_db
from app.main import app


@pytest.fixture
def client():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)

    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def test_health_check(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


@pytest.mark.parametrize("origin", ["http://localhost:5173", "http://127.0.0.1:5173"])
def test_cors_headers(client, origin):
    response = client.options(
        "/health",
        headers={
            "Origin": origin,
            "Access-Control-Request-Method": "GET",
        },
    )
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == origin


def test_create_and_fetch_deck(client):
    payload = {"name": "Test Deck", "format": "Commander", "description": "A deck for testing"}

    create_response = client.post("/decks", json=payload)
    assert create_response.status_code == 201
    created = create_response.json()
    assert created["name"] == payload["name"]
    assert created["format"] == payload["format"]

    deck_id = created["id"]
    fetch_response = client.get(f"/decks/{deck_id}")
    assert fetch_response.status_code == 200
    assert fetch_response.json()["id"] == deck_id


def test_search_cards(monkeypatch, client):
    def fake_search(query: str):
        return [
            {
                "id": "abc123",
                "name": "Lightning Bolt",
                "mana_cost": "{R}",
                "type_line": "Instant",
                "oracle_text": "Lightning Bolt deals 3 damage to any target.",
                "set_name": "Core Set 2021",
                "collector_number": "123",
                "image_uris": {"normal": "https://example.com/bolt.jpg"},
                "prices": {"usd": "0.50"},
            }
        ]

    monkeypatch.setattr("app.api.routes.cards.scryfall_client.search_cards", fake_search)

    response = client.get("/cards/search", params={"q": "lightning bolt"})
    assert response.status_code == 200
    response_json = response.json()
    assert response_json["query"] == "lightning bolt"
    assert response_json["total_cards"] == 1
    assert response_json["cards"][0]["name"] == "Lightning Bolt"
