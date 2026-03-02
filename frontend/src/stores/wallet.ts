import { defineStore } from 'pinia'
import { ref } from 'vue'
import { paperOrderService } from '../services/PaperOrderService'
import { useTransactionsStore } from './transactions'
import { usePositionsStore } from './positions'
import { useWatchlistStore } from './watchlist'
import type { Order, Transaction } from '../types'

export const useWalletStore = defineStore('wallet', () => {
  const balance = ref(100_000) // Starting balance: PHP 100,000

  function validateOrder(order: Order): string | null {
    if (!order.ticker) return 'Please select a stock.'
    if (order.amount <= 0) return 'Amount must be greater than zero.'
    if (order.amount > balance.value) return 'Insufficient balance.'
    return null
  }

  async function submitOrder(order: Order): Promise<Transaction> {
    const error = validateOrder(order)
    if (error) throw new Error(error)

    const transaction = await paperOrderService.submitOrder(order, balance.value)

    balance.value -= order.amount

    const transactionsStore = useTransactionsStore()
    transactionsStore.add(transaction)

    const positionsStore = usePositionsStore()
    positionsStore.open(order, transaction)

    const watchlistStore = useWatchlistStore()
    watchlistStore.add(order.ticker)

    return transaction
  }

  function credit(amount: number) {
    balance.value += amount
  }

  return { balance, validateOrder, submitOrder, credit }
})
