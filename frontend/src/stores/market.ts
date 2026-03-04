import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { mockMarketService } from '../services/MockMarketService'
import type { IMarketService } from '../services/IMarketService'
import type { Stock } from '../types'

// Module-level active service — defaults to mock for offline dev and tests.
// Call setMarketService() from main.ts to swap in the API service.
let _service: IMarketService = mockMarketService

export function setMarketService(svc: IMarketService): void {
  _service = svc
}

export const useMarketStore = defineStore('market', () => {
  const stocks = ref<Stock[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const lastUpdated = ref<Date | null>(null)
  // Initialised from the service; updated after every successful refresh().
  const marketOpen = ref<boolean>(_service.isMarketOpen())

  const topGainers = computed(() =>
    [...stocks.value].filter(s => s.changePct > 0).sort((a, b) => b.changePct - a.changePct).slice(0, 10)
  )
  const topLosers = computed(() =>
    [...stocks.value].filter(s => s.changePct < 0).sort((a, b) => a.changePct - b.changePct).slice(0, 10)
  )
  const mostActive = computed(() =>
    [...stocks.value].sort((a, b) => b.volume - a.volume).slice(0, 10)
  )

  async function refresh() {
    loading.value = true
    error.value = null
    try {
      stocks.value = await _service.getStocks()
      marketOpen.value = _service.isMarketOpen()
      lastUpdated.value = new Date()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load market data'
    } finally {
      loading.value = false
    }
  }

  return { stocks, loading, error, lastUpdated, marketOpen, topGainers, topLosers, mostActive, refresh }
})
