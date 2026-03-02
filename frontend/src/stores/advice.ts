import { defineStore } from 'pinia'
import { computed } from 'vue'
import { useMarketStore } from './market'
import type { Recommendation } from '../types'

export const useAdviceStore = defineStore('advice', () => {
  const market = useMarketStore()

  const recommendations = computed<Recommendation[]>(() => {
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

  return { recommendations }
})
