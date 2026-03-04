import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useTransactionsStore } from '../../../src/stores/transactions'
import type { Transaction } from '../../../src/types'

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeTx(id: string, date = '2026-03-03T01:00:00.000Z'): Transaction {
  return { id, ticker: 'SM', type: 'long', amount: 5000, date, status: 'open' }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useTransactionsStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  // ── Initial state ──────────────────────────────────────────────────────────

  it('starts with empty transactions', () => {
    const store = useTransactionsStore()
    expect(store.transactions).toHaveLength(0)
  })

  it('isEmpty is true when no transactions', () => {
    const store = useTransactionsStore()
    expect(store.isEmpty).toBe(true)
  })

  // ── add() ──────────────────────────────────────────────────────────────────

  it('add() prepends a transaction to the list', () => {
    const store = useTransactionsStore()
    store.add(makeTx('tx-1'))
    expect(store.transactions).toHaveLength(1)
    expect(store.transactions[0].id).toBe('tx-1')
  })

  it('add() inserts newest at index 0 (prepend)', () => {
    const store = useTransactionsStore()
    store.add(makeTx('tx-old'))
    store.add(makeTx('tx-new'))
    expect(store.transactions[0].id).toBe('tx-new')
    expect(store.transactions[1].id).toBe('tx-old')
  })

  it('isEmpty becomes false after add()', () => {
    const store = useTransactionsStore()
    store.add(makeTx('tx-1'))
    expect(store.isEmpty).toBe(false)
  })

  it('transactions are sorted newest-first after multiple adds', () => {
    const store = useTransactionsStore()
    store.add(makeTx('tx-1', '2026-03-03T09:00:00Z'))
    store.add(makeTx('tx-2', '2026-03-03T10:00:00Z'))
    store.add(makeTx('tx-3', '2026-03-03T11:00:00Z'))
    // Last added is at index 0
    expect(store.transactions[0].id).toBe('tx-3')
    expect(store.transactions[2].id).toBe('tx-1')
  })

  // ── fetchTransactions() ───────────────────────────────────────────────────

  it('fetchTransactions populates transactions from API response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        transactions: [
          { id: 'api-1', ticker: 'SM', type: 'long', amount: 9000, status: 'open', createdAt: '2026-03-03T09:00:00Z' },
          { id: 'api-2', ticker: 'ALI', type: 'short', amount: 5000, status: 'closed', createdAt: '2026-03-03T08:00:00Z' },
        ],
      }),
    } as Response)

    const store = useTransactionsStore()
    await store.fetchTransactions()

    expect(store.transactions).toHaveLength(2)
    expect(store.transactions[0].id).toBe('api-1')
    expect(store.transactions[1].id).toBe('api-2')
    expect(store.transactions[0].status).toBe('open')
    expect(store.transactions[1].status).toBe('closed')
  })

  it('fetchTransactions maps createdAt to date field', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        transactions: [
          { id: 'x', ticker: 'SM', type: 'long', amount: 1000, status: 'open', createdAt: '2026-03-03T09:00:00Z' },
        ],
      }),
    } as Response)

    const store = useTransactionsStore()
    await store.fetchTransactions()

    expect(store.transactions[0].date).toBe('2026-03-03T09:00:00Z')
  })

  it('fetchTransactions is a no-op on network error', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network failure'))

    const store = useTransactionsStore()
    store.add(makeTx('tx-existing'))
    await store.fetchTransactions()

    // Existing state preserved
    expect(store.transactions[0].id).toBe('tx-existing')
  })

  it('fetchTransactions is a no-op on non-ok response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
    } as Response)

    const store = useTransactionsStore()
    store.add(makeTx('tx-local'))
    await store.fetchTransactions()

    expect(store.transactions[0].id).toBe('tx-local')
  })
})
