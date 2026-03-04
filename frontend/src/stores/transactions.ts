import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { Transaction, OrderType } from '../types'

export const useTransactionsStore = defineStore('transactions', () => {
  const transactions = ref<Transaction[]>([])

  const isEmpty = computed(() => transactions.value.length === 0)

  function add(transaction: Transaction) {
    transactions.value.unshift(transaction)
  }

  /** Sync transaction history from the API (no-op in mock mode if endpoint unavailable). */
  async function fetchTransactions(): Promise<void> {
    try {
      const res = await fetch('/api/v1/transactions')
      if (!res.ok) return
      const data = await res.json() as {
        transactions: Array<{
          id: string
          ticker: string
          type: string
          amount: number
          status: string
          createdAt: string
        }>
      }
      transactions.value = data.transactions.map(t => ({
        id: t.id,
        ticker: t.ticker,
        type: t.type as OrderType,
        amount: t.amount,
        date: t.createdAt,
        status: t.status as Transaction['status'],
      }))
    } catch {
      // Network failure — keep existing in-memory state
    }
  }

  return { transactions, isEmpty, add, fetchTransactions }
})
