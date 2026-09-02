import { useEffect, useState } from 'react'
import './App.css'

const API_BASE_URL = 'http://127.0.0.1:8000'

function App() {
  const [query, setQuery] = useState('')
  const [cards, setCards] = useState([])
  const [deckName, setDeckName] = useState('New Deck')
  const [deck, setDeck] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const createDeck = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/decks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: deckName,
            format: 'Commander',
            description: 'Deck created from the app',
          }),
        })

        if (!response.ok) {
          throw new Error('Failed to create deck')
        }

        const deckData = await response.json()
        setDeck(deckData)
      } catch (err) {
        setError(err.message)
      }
    }

    if (!deck) {
      createDeck()
    }
  }, [deckName, deck])

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
              <h3>{deck.name}</h3>
              <p>{deck.format}</p>
              <ul>
                {(deck.cards || []).map((card) => (
                  <li key={`${deck.id}-${card.scryfall_id}`}>
                    {card.name} x{card.quantity}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p>Creating deck...</p>
          )}
        </aside>
      </main>
    </div>
  )
}

export default App
