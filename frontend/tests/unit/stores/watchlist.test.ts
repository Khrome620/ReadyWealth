import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useWatchlistStore } from '../../../src/stores/watchlist'
import { useMarketStore } from '../../../src/stores/market'

// ── Fixtures ──────────────────────────────────────────────────────────────────

const MARKET_STOCKS = [
  { ticker: 'SM', name: 'SM Investments Corp.', price: 1000, change: 10, changePct: 1.0, volume: 100000 },
  { ticker: 'ALI', name: 'Ayala Land Inc.', price: 35, change: -0.5, changePct: -1.4, volume: 50000 },
  { ticker: 'BDO', name: 'BDO Unibank Inc.', price: 140, change: 2, changePct: 1.45, volume: 80000 },
]

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useWatchlistStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.resetAllMocks()
  })

  // ── Initial state ──────────────────────────────────────────────────────────

  it('starts with empty watchlist', () => {
    const store = useWatchlistStore()
    expect(store.watchlistTickers).toHaveLength(0)
  })

  it('watchlistStocks is empty initially', () => {
    const market = useMarketStore()
    market.stocks = [...MARKET_STOCKS]
    const store = useWatchlistStore()
    expect(store.watchlistStocks).toHaveLength(0)
  })

  // ── add() ─────────────────────────────────────────────────────────────────

  it('add() appends a ticker to the list', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true, json: () => Promise.resolve({}),
    } as Response)

    const store = useWatchlistStore()
    await store.add('SM')
    expect(store.watchlistTickers).toContain('SM')
  })

  it('add() prevents duplicates (addIfAbsent behaviour)', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true, json: () => Promise.resolve({}),
    } as Response)

    const store = useWatchlistStore()
    await store.add('SM')
    await store.add('SM')
    expect(store.watchlistTickers.filter(t => t === 'SM')).toHaveLength(1)
  })

  it('add() does not POST when ticker already present', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true, json: () => Promise.resolve({}),
    } as Response)

    const store = useWatchlistStore()
    await store.add('ALI')
    const callsBefore = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.length
    await store.add('ALI') // duplicate — should return early without fetching
    const callsAfter = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.length
    expect(callsAfter).toBe(callsBefore)
  })

  it('add() falls back to local add on network error (mock mode)', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network failure'))

    const store = useWatchlistStore()
    await store.add('BDO')
    expect(store.watchlistTickers).toContain('BDO')
  })

  // ── remove() ──────────────────────────────────────────────────────────────

  it('remove() removes a ticker from the list', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) } as Response) // POST
      .mockResolvedValueOnce({ ok: true } as Response) // DELETE

    const store = useWatchlistStore()
    await store.add('BDO')
    await store.remove('BDO')
    expect(store.watchlistTickers).not.toContain('BDO')
  })

  it('remove() is a no-op if ticker not in list', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true } as Response)

    const store = useWatchlistStore()
    await store.remove('MISSING')
    expect(store.watchlistTickers).toHaveLength(0)
  })

  // ── toggle() ──────────────────────────────────────────────────────────────

  it('toggle() adds ticker when not in watchlist', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true, json: () => Promise.resolve({}),
    } as Response)

    const store = useWatchlistStore()
    await store.toggle('SM')
    expect(store.watchlistTickers).toContain('SM')
  })

  it('toggle() removes ticker when already in watchlist', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) } as Response) // POST
      .mockResolvedValueOnce({ ok: true } as Response) // DELETE

    const store = useWatchlistStore()
    await store.toggle('SM') // add
    await store.toggle('SM') // remove
    expect(store.watchlistTickers).not.toContain('SM')
  })

  // ── watchlistStocks computed ───────────────────────────────────────────────

  it('watchlistStocks returns market stock objects for tracked tickers', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true, json: () => Promise.resolve({}),
    } as Response)

    const market = useMarketStore()
    market.stocks = [...MARKET_STOCKS]
    const store = useWatchlistStore()
    await store.add('SM')
    await store.add('BDO')
    expect(store.watchlistStocks).toHaveLength(2)
    expect(store.watchlistStocks.map(s => s.ticker)).toEqual(expect.arrayContaining(['SM', 'BDO']))
  })

  it('watchlistStocks excludes tickers not present in market data', () => {
    const market = useMarketStore()
    market.stocks = [...MARKET_STOCKS]
    const store = useWatchlistStore()
    store.watchlistTickers.push('GHOST') // ticker not in market
    expect(store.watchlistStocks).toHaveLength(0)
  })

  // ── fetchWatchlist() ──────────────────────────────────────────────────────

  it('fetchWatchlist populates tickers from API response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        watchlist: [
          { ticker: 'SM', name: 'SM Investments', price: 1000, isAutoAdded: false, addedAt: '2026-03-03T00:00:00Z' },
          { ticker: 'ALI', name: 'Ayala Land', price: 35, isAutoAdded: false, addedAt: '2026-03-03T00:00:00Z' },
        ],
      }),
    } as Response)

    const store = useWatchlistStore()
    await store.fetchWatchlist()

    expect(store.watchlistTickers).toHaveLength(2)
    expect(store.watchlistTickers).toEqual(expect.arrayContaining(['SM', 'ALI']))
  })

  it('fetchWatchlist is a no-op on non-ok response', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 503 } as Response)

    const store = useWatchlistStore()
    store.watchlistTickers.push('SM') // existing local state
    await store.fetchWatchlist()

    expect(store.watchlistTickers).toContain('SM') // preserved
  })

  it('fetchWatchlist is a no-op on network error', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network failure'))

    const store = useWatchlistStore()
    store.watchlistTickers.push('BDO')
    await store.fetchWatchlist()

    expect(store.watchlistTickers).toContain('BDO') // preserved
  })
})
