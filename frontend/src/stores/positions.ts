import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useMarketStore } from './market'
import { useWalletStore } from './wallet'
import { useTransactionsStore } from './transactions'
import { useSnack } from '../composables/useSnack'
import type { Order, OrderType, Position, Transaction } from '../types'

export const usePositionsStore = defineStore('positions', () => {
  const openPositions = ref<Position[]>([])
  const initialized = ref(false)

  /** Enriches each position with current price and P&L from market data. */
  const positionsWithCurrentValue = computed(() => {
    const market = useMarketStore()
    return openPositions.value.map(pos => {
      const stock = market.stocks.find(s => s.ticker === pos.ticker)
      const currentPrice = stock?.price ?? pos.entryPrice
      const currentValue = pos.shares * currentPrice
      // Long: profit when price rises; Short: profit when price falls (R-04)
      const pnl = pos.type === 'long'
        ? currentValue - pos.investedAmount
        : pos.investedAmount - currentValue
      const pnlPct = pos.investedAmount > 0 ? (pnl / pos.investedAmount) * 100 : 0
      return { ...pos, currentPrice, currentValue, pnl, pnlPct }
    })
  })

  /** Adds a new position locally (optimistic update after order placement). */
  function open(order: Order, transaction: Transaction) {
    const market = useMarketStore()
    const stock = market.stocks.find(s => s.ticker === order.ticker)
    const entryPrice = stock?.price ?? 1
    const shares = entryPrice > 0 ? order.amount / entryPrice : 0
    openPositions.value.push({
      id: transaction.id,
      ticker: order.ticker,
      type: order.type,
      investedAmount: order.amount,
      shares,
      entryPrice,
      currentPrice: entryPrice,
    })
  }

  /** Sync open positions from API. */
  async function fetchPositions(): Promise<void> {
    try {
      const res = await fetch('/api/v1/positions')
      if (!res.ok) return
      const data = await res.json() as {
        positions: Array<{
          orderId: string
          ticker: string
          type: string
          investedAmount: number
          shares: number
          entryPrice: number
          currentPrice: number
        }>
      }
      openPositions.value = data.positions.map(p => ({
        id: p.orderId,
        ticker: p.ticker,
        type: p.type as OrderType,
        investedAmount: p.investedAmount,
        shares: p.shares,
        entryPrice: p.entryPrice,
        currentPrice: p.currentPrice,
      }))
      initialized.value = true
    } catch {
      // Network failure — keep existing in-memory state
    }
  }

  function reset() {
    openPositions.value = []
    initialized.value = false
  }

  const market = useMarketStore()

  /** Close a position: calls API if available; credits wallet with returned value. */
  async function closePosition(positionId: string): Promise<number> {
    const { showSuccess } = useSnack()
    try {
      const res = await fetch(`/api/v1/positions/${positionId}/close`, { method: 'POST' })
      if (res.ok) {
        const data = await res.json() as {
          realizedPnl: number
          walletBalance: number
        }
        openPositions.value = openPositions.value.filter(p => p.id !== positionId)

        const walletStore = useWalletStore()
        walletStore.credit(data.realizedPnl)

        const txStore = useTransactionsStore()
        const tx = txStore.transactions.find(t => t.id === positionId)
        if (tx) { tx.status = 'closed'; tx.realizedPnl = data.realizedPnl; tx.closedAt = new Date().toISOString() }

        try { showSuccess(`Position closed. P&L: ₱${data.realizedPnl.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`) } catch { /* snackbar unavailable */ }
        return data.realizedPnl
      }
    } catch {
      // Fall through to local close
    }

    // Local fallback (mock mode): remove position and return current value
    const idx = openPositions.value.findIndex(p => p.id === positionId)
    if (idx === -1) return 0

    const pos = openPositions.value[idx]
    const currentPrice = market.stocks.find(s => s.ticker === pos.ticker)?.price ?? pos.entryPrice
    const currentValue = pos.shares * currentPrice
    const pnl = pos.type === 'long' ? currentValue - pos.investedAmount : pos.investedAmount - currentValue
    openPositions.value.splice(idx, 1)

    const walletStore = useWalletStore()
    walletStore.credit(pos.investedAmount + pnl)

    const txStore = useTransactionsStore()
    const tx = txStore.transactions.find(t => t.id === positionId)
    if (tx) { tx.status = 'closed'; tx.realizedPnl = pnl; tx.closedAt = new Date().toISOString() }

    try { showSuccess(`Position closed. P&L: ${pnl >= 0 ? '+' : ''}₱${pnl.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`) } catch { /* snackbar unavailable */ }
    return pnl
  }

  return { openPositions, positionsWithCurrentValue, initialized, open, fetchPositions, reset, closePosition }
})
