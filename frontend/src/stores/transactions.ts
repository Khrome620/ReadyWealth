import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import type { Transaction, OrderType } from '../types'

const STORAGE_KEY = 'rw_transactions'

export const useTransactionsStore = defineStore('transactions', () => {
  // Hydrate from localStorage on first load
  const stored = localStorage.getItem(STORAGE_KEY)
  const transactions = ref<Transaction[]>(stored ? JSON.parse(stored) : [])

  // Persist whenever transactions change
  watch(transactions, val => localStorage.setItem(STORAGE_KEY, JSON.stringify(val)), { deep: true })

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

  function clear() {
    transactions.value = []
  }

  return { transactions, isEmpty, add, clear, fetchTransactions }
})
