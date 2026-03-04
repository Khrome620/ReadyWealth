import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useMarketStore } from './market'

export const useWatchlistStore = defineStore('watchlist', () => {
  const watchlistTickers = ref<string[]>([])

  const watchlistStocks = computed(() => {
    const market = useMarketStore()
    return market.stocks.filter(s => watchlistTickers.value.includes(s.ticker))
  })

  /** Sync watchlist from API (no-op in mock mode if endpoint unavailable). */
  async function fetchWatchlist(): Promise<void> {
    try {
      const res = await fetch('/api/v1/watchlist')
      if (!res.ok) return
      const data = await res.json() as { watchlist: Array<{ ticker: string }> }
      watchlistTickers.value = data.watchlist.map(item => item.ticker)
    } catch {
      // Network failure — keep existing in-memory state
    }
  }

  /** Add ticker to watchlist. Calls POST /api/v1/watchlist; falls back to local in mock mode. */
  async function add(ticker: string): Promise<void> {
    if (watchlistTickers.value.includes(ticker)) return
    try {
      const res = await fetch('/api/v1/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker }),
      })
      if (res.ok) {
        watchlistTickers.value.push(ticker)
      }
    } catch {
      // Network failure — add locally (mock mode)
      watchlistTickers.value.push(ticker)
    }
  }

  /** Remove ticker from watchlist. Calls DELETE /api/v1/watchlist/{ticker}; local fallback. */
  async function remove(ticker: string): Promise<void> {
    try {
      await fetch(`/api/v1/watchlist/${ticker}`, { method: 'DELETE' })
    } catch {
      // Network failure — proceed with local removal
    }
    watchlistTickers.value = watchlistTickers.value.filter(t => t !== ticker)
  }

  async function toggle(ticker: string): Promise<void> {
    if (watchlistTickers.value.includes(ticker)) await remove(ticker)
    else await add(ticker)
  }

  return { watchlistTickers, watchlistStocks, add, remove, toggle, fetchWatchlist }
})
