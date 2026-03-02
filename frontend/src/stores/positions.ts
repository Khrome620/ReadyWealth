import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useMarketStore } from './market'
import type { Order, Position, Transaction } from '../types'

export const usePositionsStore = defineStore('positions', () => {
  const openPositions = ref<Position[]>([])

  const positionsWithCurrentValue = computed(() => {
    const market = useMarketStore()
    return openPositions.value.map(pos => {
      const stock = market.stocks.find(s => s.ticker === pos.ticker)
      const currentPrice = stock?.price ?? pos.entryPrice
      const currentValue = pos.shares * currentPrice
      const pnl = currentValue - pos.investedAmount
      return { ...pos, currentPrice, currentValue, pnl }
    })
  })

  function open(order: Order, transaction: Transaction) {
    const entryPrice = order.amount / Math.max(order.amount / 10, 1) // simplified: 1 share per 10 PHP
    const shares = order.amount / 10
    openPositions.value.push({
      id: transaction.id,
      ticker: order.ticker,
      type: order.type,
      investedAmount: order.amount,
      shares,
      entryPrice: 10,
      currentPrice: 10,
    })
  }

  function closePosition(positionId: string): number {
    const idx = openPositions.value.findIndex(p => p.id === positionId)
    if (idx === -1) return 0
    const market = useMarketStore()
    const pos = openPositions.value[idx]
    const stock = market.stocks.find(s => s.ticker === pos.ticker)
    const currentPrice = stock?.price ?? pos.entryPrice
    const currentValue = pos.shares * currentPrice
    openPositions.value.splice(idx, 1)
    return currentValue
  }

  return { openPositions, positionsWithCurrentValue, open, closePosition }
})
