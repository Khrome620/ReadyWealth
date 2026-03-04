import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useMarketStore } from './market'
import type { Recommendation } from '../types'

export const useAdviceStore = defineStore('advice', () => {
  const market = useMarketStore()

  // Set by fetchRecommendations() when the API is available; null = use computed fallback
  const _fetched = ref<Recommendation[] | null>(null)
  const generatedAt = ref<string | null>(null)
  const unavailableUntil = ref<string | null>(null)

  /** Derived locally from market store — used as fallback in mock/offline mode. */
  const _computed = computed<Recommendation[]>(() => {
    if (!market.stocks.length) return []

    const topMovers = [...market.stocks]
      .filter(s => s.changePct > 0)
      .sort((a, b) => b.changePct - a.changePct)
      .slice(0, 3)
      .map(s => ({
        ticker: s.ticker,
        name: s.name,
        currentPrice: s.price,
        reason: 'Strong upward momentum',
        confidence: (s.changePct > 3 ? 'high' : s.changePct >= 1 ? 'medium' : 'low') as Recommendation['confidence'],
      }))

    const topVolume = [...market.stocks]
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 2)
      .filter(s => !topMovers.some(m => m.ticker === s.ticker))
      .map(s => ({
        ticker: s.ticker,
        name: s.name,
        currentPrice: s.price,
        reason: 'High trading activity',
        confidence: 'medium' as Recommendation['confidence'],
      }))

    return [...topMovers, ...topVolume].slice(0, 5)
  })

  /** Visible recommendations: API result when available, else computed fallback. */
  const recommendations = computed<Recommendation[]>(() => _fetched.value ?? _computed.value)

  /** Fetch recommendations from the API. Falls back to computed on 503. */
  async function fetchRecommendations(): Promise<void> {
    try {
      const res = await fetch('/api/v1/recommendations')
      if (res.status === 503) {
        const data = await res.json()
        unavailableUntil.value = data.retryAfter ?? null
        _fetched.value = null
        return
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      _fetched.value = (data.recommendations as Array<{
        ticker: string
        name: string
        currentPrice: number
        reason: string
        confidence: string
      }>).map(r => ({
        ticker: r.ticker,
        name: r.name,
        currentPrice: r.currentPrice,
        reason: r.reason,
        confidence: r.confidence as Recommendation['confidence'],
      }))
      generatedAt.value = data.generatedAt ?? null
      unavailableUntil.value = null
    } catch {
      // Network failure — stay with computed fallback, keep existing state
    }
  }

  return { recommendations, generatedAt, unavailableUntil, fetchRecommendations }
})
