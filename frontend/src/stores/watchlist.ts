import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useMarketStore } from './market'

export const useWatchlistStore = defineStore('watchlist', () => {
  const watchlistTickers = ref<string[]>([])

  const watchlistStocks = computed(() => {
    const market = useMarketStore()
    return market.stocks.filter(s => watchlistTickers.value.includes(s.ticker))
  })

  function add(ticker: string) {
    if (!watchlistTickers.value.includes(ticker)) {
      watchlistTickers.value.push(ticker)
    }
  }

  function remove(ticker: string) {
    watchlistTickers.value = watchlistTickers.value.filter(t => t !== ticker)
  }

  function toggle(ticker: string) {
    if (watchlistTickers.value.includes(ticker)) remove(ticker)
    else add(ticker)
  }

  return { watchlistTickers, watchlistStocks, add, remove, toggle }
})
