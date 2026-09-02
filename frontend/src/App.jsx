import { useEffect, useState } from 'react'
import './App.css'

const API_BASE_URL = 'http://127.0.0.1:8000'

function App() {
  const [query, setQuery] = useState('')
  const [cards, setCards] = useState([])
  const [deckName, setDeckName] = useState('New Deck')
  const [deck, setDeck] = useState({
    name: 'New Deck',
    format: 'Commander',
    description: 'Deck created from the app',
    cards: [],
    has_commander: true,
    commander_scryfall_id: null,
  })
  const [savedDecks, setSavedDecks] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchSavedDecks = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/decks`)
        if (!response.ok) {
          throw new Error('Failed to fetch decks')
        }
        const decks = await response.json()
        setSavedDecks(decks)
      } catch (err) {
        console.error('Error fetching saved decks:', err)
      }
    }

    fetchSavedDecks()
  }, [])

  const handleSearch = async (event) => {
    event.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch(`${API_BASE_URL}/cards/search?q=${encodeURIComponent(query)}`)
      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        const detail = payload?.detail || 'Search failed'
        throw new Error(detail)
      }

      setCards(payload?.cards || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const addCardToDeck = async (card) => {
    if (!deck) return

    // If deck is not saved yet (no ID), add to local cards array
    if (!deck.id) {
      const existingCard = deck.cards.find((c) => c.scryfall_id === card.id)
      if (existingCard) {
        existingCard.quantity += 1
      } else {
        deck.cards.push({
          scryfall_id: card.id,
          name: card.name,
          quantity: 1,
          mana_cost: card.mana_cost,
          type_line: card.type_line,
          set_name: card.set_name,
          collector_number: card.collector_number,
        })
      }
      setDeck({ ...deck })
      return
    }

    // If deck is saved, post to API
    try {
      const response = await fetch(`${API_BASE_URL}/decks/${deck.id}/cards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scryfall_id: card.id,
          name: card.name,
          quantity: 1,
          mana_cost: card.mana_cost,
          type_line: card.type_line,
          set_name: card.set_name,
          collector_number: card.collector_number,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to add card')
      }

      const updatedDeck = await response.json()
      setDeck(updatedDeck)
    } catch (err) {
      setError(err.message)
    }
  }

  const saveDeckName = async () => {
    if (!deck) return

    try {
      let response
      let createdDeck

      // If deck doesn't have an ID, create it first
      if (!deck.id) {
        response = await fetch(`${API_BASE_URL}/decks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: deckName,
            format: deck.format,
            description: deck.description,
          }),
        })

        if (!response.ok) {
          throw new Error('Failed to create deck')
        }

        createdDeck = await response.json()
        setDeck(createdDeck)

        // Add the new deck to savedDecks list
        setSavedDecks([...savedDecks, createdDeck])
      } else {
        // Update existing deck
        response = await fetch(`${API_BASE_URL}/decks/${deck.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: deckName }),
        })

        if (!response.ok) {
          throw new Error('Failed to save deck name')
        }

        const updatedDeck = await response.json()
        setDeck(updatedDeck)

        // Update the deck in savedDecks list
        setSavedDecks(
          savedDecks.map((d) => (d.id === updatedDeck.id ? updatedDeck : d))
        )
      }

      setError('')
    } catch (err) {
      setError(err.message)
    }
  }

  const loadDeck = async (deckId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/decks/${deckId}`)

      if (!response.ok) {
        throw new Error('Failed to load deck')
      }

      const loadedDeck = await response.json()
      setDeck(loadedDeck)
      setDeckName(loadedDeck.name)
      setError('')
    } catch (err) {
      setError(err.message)
    }
  }

  const deleteDeck = async (deckId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/decks/${deckId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete deck')
      }

      setSavedDecks(savedDecks.filter((d) => d.id !== deckId))
      setError('')
    } catch (err) {
      setError(err.message)
    }
  }

  const removeCardFromDeck = async (scryfall_id) => {
    if (!deck) return

    // If deck is not saved, remove from local array
    if (!deck.id) {
      setDeck({
        ...deck,
        cards: deck.cards.filter((c) => c.scryfall_id !== scryfall_id),
      })
      return
    }

    // If deck is saved, delete from API
    try {
      const response = await fetch(
        `${API_BASE_URL}/decks/${deck.id}/cards/${scryfall_id}`,
        { method: 'DELETE' }
      )

      if (!response.ok) {
        throw new Error('Failed to remove card')
      }

      const updatedDeck = await response.json()
      setDeck(updatedDeck)
    } catch (err) {
      setError(err.message)
    }
  }

  const updateCardQuantity = async (scryfall_id, delta) => {
    if (!deck) return

    const card = deck.cards.find((c) => c.scryfall_id === scryfall_id)
    if (!card) return

    const newQuantity = card.quantity + delta
    if (newQuantity <= 0) {
      removeCardFromDeck(scryfall_id)
      return
    }

    // If deck is not saved, update local
    if (!deck.id) {
      card.quantity = newQuantity
      setDeck({ ...deck })
      return
    }

    // For saved decks, we'd need a PATCH endpoint to update just quantity
    // For now, remove and re-add with new quantity
    try {
      // First remove the card
      await fetch(`${API_BASE_URL}/decks/${deck.id}/cards/${scryfall_id}`, {
        method: 'DELETE',
      })

      // Then add it back with new quantity
      const response = await fetch(`${API_BASE_URL}/decks/${deck.id}/cards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scryfall_id: card.scryfall_id,
          name: card.name,
          quantity: newQuantity,
          mana_cost: card.mana_cost,
          type_line: card.type_line,
          set_name: card.set_name,
          collector_number: card.collector_number,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update card quantity')
      }

      const updatedDeck = await response.json()
      setDeck(updatedDeck)
    } catch (err) {
      setError(err.message)
    }
  }

  const toggleHasCommander = async () => {
    const newHasCommander = !deck.has_commander

    // If local deck, just update local state
    if (!deck.id) {
      setDeck({
        ...deck,
        has_commander: newHasCommander,
        commander_scryfall_id: newHasCommander ? deck.commander_scryfall_id : null,
      })
      return
    }

    // If saved deck, update via API
    try {
      const response = await fetch(`${API_BASE_URL}/decks/${deck.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ has_commander: newHasCommander }),
      })

      if (!response.ok) {
        throw new Error('Failed to update commander setting')
      }

      const updatedDeck = await response.json()
      setDeck(updatedDeck)
      setSavedDecks(
        savedDecks.map((d) => (d.id === updatedDeck.id ? updatedDeck : d))
      )
    } catch (err) {
      setError(err.message)
    }
  }

  const setCommander = async (scryfall_id) => {
    // If local deck, just update local state
    if (!deck.id) {
      setDeck({ ...deck, commander_scryfall_id: scryfall_id })
      return
    }

    // If saved deck, POST to API
    try {
      const response = await fetch(
        `${API_BASE_URL}/decks/${deck.id}/commander/${scryfall_id}`,
        { method: 'POST' }
      )

      if (!response.ok) {
        throw new Error('Failed to set commander')
      }

      const updatedDeck = await response.json()
      setDeck(updatedDeck)
      setSavedDecks(
        savedDecks.map((d) => (d.id === updatedDeck.id ? updatedDeck : d))
      )
    } catch (err) {
      setError(err.message)
    }
  }

  const unsetCommander = async () => {
    // If local deck, just update local state
    if (!deck.id) {
      setDeck({ ...deck, commander_scryfall_id: null })
      return
    }

    // If saved deck, DELETE via API
    try {
      const response = await fetch(
        `${API_BASE_URL}/decks/${deck.id}/commander`,
        { method: 'DELETE' }
      )

      if (!response.ok) {
        throw new Error('Failed to unset commander')
      }

      const updatedDeck = await response.json()
      setDeck(updatedDeck)
      setSavedDecks(
        savedDecks.map((d) => (d.id === updatedDeck.id ? updatedDeck : d))
      )
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <h1>Magic Deck Builder</h1>
        <div className="deck-meta">
          <label>
            Deck name
            <input
              value={deckName}
              onChange={(event) => setDeckName(event.target.value)}
            />
          </label>
          <button type="button" onClick={saveDeckName}>
            Save Deck
          </button>
        </div>
      </header>

      <main className="layout">
        <section className="panel search-panel">
          <h2>Search cards</h2>
          <form onSubmit={handleSearch} className="search-form">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by card name..."
            />
            <button type="submit" disabled={loading}>
              {loading ? 'Searching...' : 'Search'}
            </button>
          </form>

          {error && <p className="error">{error}</p>}

          <div className="card-list">
            {cards.map((card) => (
              <div key={card.id} className="card-item">
                <div>
                  <strong>{card.name}</strong>
                  <p>{card.type_line || 'Unknown type'}</p>
                  <small>{card.set_name}</small>
                </div>
                <button type="button" onClick={() => addCardToDeck(card)}>
                  Add
                </button>
              </div>
            ))}
          </div>
        </section>

        <aside className="panel deck-panel">
          <h2>Current deck</h2>
          {deck ? (
            <>
              <h3>
                {deck.name}
                {!deck.id && <span className="unsaved-badge"> (unsaved)</span>}
              </h3>
              <p>{deck.format}</p>
              <div className="commander-toggle">
                <label>
                  <input
                    type="checkbox"
                    checked={deck.has_commander || false}
                    onChange={toggleHasCommander}
                  />
                  Has Commander
                </label>
              </div>
              <ul className="deck-cards-list">
                {(deck.cards || []).map((card) => (
                  <li
                    key={`${deck.id}-${card.scryfall_id}`}
                    className={`deck-card-item ${
                      deck.commander_scryfall_id === card.scryfall_id ? 'is-commander' : ''
                    }`}
                  >
                    <div className="card-info">
                      <strong>{card.name}</strong>
                      <small>{card.type_line}</small>
                      {deck.commander_scryfall_id === card.scryfall_id && (
                        <span className="commander-badge">Commander</span>
                      )}
                    </div>
                    <div className="card-controls">
                      <button
                        type="button"
                        className="qty-btn"
                        onClick={() => updateCardQuantity(card.scryfall_id, -1)}
                      >
                        −
                      </button>
                      <span className="qty-display">x{card.quantity}</span>
                      <button
                        type="button"
                        className="qty-btn"
                        onClick={() => updateCardQuantity(card.scryfall_id, 1)}
                      >
                        +
                      </button>
                      {deck.has_commander && (
                        <>
                          {deck.commander_scryfall_id === card.scryfall_id ? (
                            <button
                              type="button"
                              className="btn-commander-active"
                              onClick={() => unsetCommander()}
                            >
                              Unset
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="btn-commander"
                              onClick={() => setCommander(card.scryfall_id)}
                            >
                              Commander
                            </button>
                          )}
                        </>
                      )}
                      <button
                        type="button"
                        className="btn-remove"
                        onClick={() => removeCardFromDeck(card.scryfall_id)}
                      >
                        Remove
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p>Creating deck...</p>
          )}
        </aside>

        <aside className="panel saved-decks-panel">
          <h2>Saved decks</h2>
          {savedDecks.length === 0 ? (
            <p>No saved decks yet</p>
          ) : (
            <ul className="saved-decks-list">
              {savedDecks.map((savedDeck) => (
                <li key={savedDeck.id} className="saved-deck-item">
                  <div>
                    <strong>{savedDeck.name}</strong>
                    <p>{savedDeck.format}</p>
                    <small>{(savedDeck.cards || []).length} cards</small>
                  </div>
                  <div className="deck-actions">
                    <button type="button" onClick={() => loadDeck(savedDeck.id)}>
                      Load
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteDeck(savedDeck.id)}
                      className="btn-delete"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </main>
    </div>
  )
}

export default App
