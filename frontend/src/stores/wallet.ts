import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { paperOrderService } from '../services/PaperOrderService'
import type { IOrderService } from '../services/IOrderService'
import { useTransactionsStore } from './transactions'
import { usePositionsStore } from './positions'
import { useWatchlistStore } from './watchlist'
import type { Order, Transaction } from '../types'

// Module-level active service — defaults to mock for offline dev and tests.
// Call setOrderService() from main.ts to swap in the API service.
let _orderService: IOrderService = paperOrderService

export function setOrderService(svc: IOrderService): void {
  _orderService = svc
}

const WALLET_STORAGE_KEY = 'rw_wallet_balance'

export const useWalletStore = defineStore('wallet', () => {
  const savedBalance = localStorage.getItem(WALLET_STORAGE_KEY)
  const balance = ref(savedBalance !== null ? parseFloat(savedBalance) : 100_000)

  watch(balance, val => localStorage.setItem(WALLET_STORAGE_KEY, String(val)))

  /** Sync balance from the backend on app mount (no-op in mock mode). */
  async function fetchBalance() {
    const serverBalance = await _orderService.fetchBalance()
    if (serverBalance !== null) balance.value = serverBalance
  }

  function validateOrder(order: Order): string | null {
    if (!order.ticker) return 'Please select a stock.'
    if (order.amount <= 0) return 'Amount must be greater than zero.'
    if (order.amount > balance.value) return 'Insufficient balance.'
    return null
  }

  async function submitOrder(order: Order): Promise<Transaction> {
    const error = validateOrder(order)
    if (error) throw new Error(error)

    const result = await _orderService.placeOrder(order)

    // Use server-reported balance when available; fall back to local decrement
    if (result.walletBalance !== null) {
      balance.value = result.walletBalance
    } else {
      balance.value -= order.amount
    }

    const transactionsStore = useTransactionsStore()
    transactionsStore.add(result.transaction)

    const positionsStore = usePositionsStore()
    positionsStore.open(order, result.transaction)

    // T031 — auto-add ticker to watchlist on every successful order (add() is idempotent)
    const watchlistStore = useWatchlistStore()
    watchlistStore.add(order.ticker)

    return result.transaction
  }

  function credit(amount: number) {
    balance.value += amount
  }

  return { balance, fetchBalance, validateOrder, submitOrder, credit }
})
