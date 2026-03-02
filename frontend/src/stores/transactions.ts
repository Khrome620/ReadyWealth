import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Transaction } from '../types'

export const useTransactionsStore = defineStore('transactions', () => {
  const transactions = ref<Transaction[]>([])

  function add(transaction: Transaction) {
    transactions.value.unshift(transaction)
  }

  return { transactions, add }
})
