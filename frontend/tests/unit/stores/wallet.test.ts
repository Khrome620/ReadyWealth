import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useWalletStore, setOrderService } from '../../../src/stores/wallet'
import { useWatchlistStore } from '../../../src/stores/watchlist'
import type { IOrderService, PlaceOrderResult } from '../../../src/services/IOrderService'
import type { Transaction } from '../../../src/types'

// ── Shared test fixtures ─────────────────────────────────────────────────────

const MOCK_TX: Transaction = {
  id: 'tx-001',
  ticker: 'SM',
  type: 'long',
  amount: 5000,
  date: '2026-03-03T01:00:00.000Z',
  status: 'open',
}

function makeMockService(overrides: Partial<IOrderService> = {}): IOrderService {
  return {
    placeOrder: vi.fn().mockResolvedValue({ transaction: MOCK_TX, walletBalance: null } as PlaceOrderResult),
    fetchBalance: vi.fn().mockResolvedValue(null),
    getOrders: vi.fn().mockResolvedValue([]),
    ...overrides,
  }
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('useWalletStore', () => {
  let mockService: IOrderService

  beforeEach(() => {
    setActivePinia(createPinia())
    mockService = makeMockService()
    setOrderService(mockService)
  })

  // ── Initial state ──────────────────────────────────────────────────────────

  it('starts with PHP 100,000 balance', () => {
    const store = useWalletStore()
    expect(store.balance).toBe(100_000)
  })

  // ── fetchBalance ───────────────────────────────────────────────────────────

  it('fetchBalance updates balance when service returns a value', async () => {
    mockService.fetchBalance = vi.fn().mockResolvedValue(80_000)
    const store = useWalletStore()
    await store.fetchBalance()
    expect(store.balance).toBe(80_000)
  })

  it('fetchBalance leaves balance unchanged when service returns null', async () => {
    mockService.fetchBalance = vi.fn().mockResolvedValue(null)
    const store = useWalletStore()
    await store.fetchBalance()
    expect(store.balance).toBe(100_000)
  })

  // ── validateOrder ──────────────────────────────────────────────────────────

  it('validateOrder returns null for a valid order', () => {
    const store = useWalletStore()
    expect(store.validateOrder({ ticker: 'SM', type: 'long', amount: 5000 })).toBeNull()
  })

  it('validateOrder returns error for empty ticker', () => {
    const store = useWalletStore()
    expect(store.validateOrder({ ticker: '', type: 'long', amount: 5000 })).toMatch(/select a stock/i)
  })

  it('validateOrder returns error when amount is zero', () => {
    const store = useWalletStore()
    expect(store.validateOrder({ ticker: 'SM', type: 'long', amount: 0 })).toMatch(/greater than zero/i)
  })

  it('validateOrder returns error when amount exceeds balance', () => {
    const store = useWalletStore()
    expect(store.validateOrder({ ticker: 'SM', type: 'long', amount: 200_000 })).toMatch(/insufficient/i)
  })

  // ── submitOrder — local balance deduction ──────────────────────────────────

  it('submitOrder decrements balance locally when walletBalance is null', async () => {
    mockService.placeOrder = vi.fn().mockResolvedValue({ transaction: MOCK_TX, walletBalance: null })
    const store = useWalletStore()
    await store.submitOrder({ ticker: 'SM', type: 'long', amount: 5000 })
    expect(store.balance).toBe(95_000)
  })

  it('submitOrder sets balance from server response when walletBalance is not null', async () => {
    mockService.placeOrder = vi.fn().mockResolvedValue({ transaction: MOCK_TX, walletBalance: 88_500 })
    const store = useWalletStore()
    await store.submitOrder({ ticker: 'SM', type: 'long', amount: 5000 })
    expect(store.balance).toBe(88_500)
  })

  it('submitOrder throws when order is invalid', async () => {
    const store = useWalletStore()
    await expect(store.submitOrder({ ticker: '', type: 'long', amount: 5000 }))
      .rejects.toThrow(/select a stock/i)
  })

  it('submitOrder throws when amount exceeds balance', async () => {
    const store = useWalletStore()
    await expect(store.submitOrder({ ticker: 'SM', type: 'long', amount: 999_999 }))
      .rejects.toThrow(/insufficient/i)
  })

  it('submitOrder returns the transaction', async () => {
    mockService.placeOrder = vi.fn().mockResolvedValue({ transaction: MOCK_TX, walletBalance: null })
    const store = useWalletStore()
    const tx = await store.submitOrder({ ticker: 'SM', type: 'long', amount: 5000 })
    expect(tx.id).toBe('tx-001')
    expect(tx.ticker).toBe('SM')
  })

  // ── T031 — auto-add ticker to watchlist ────────────────────────────────────

  it('adds ticker to watchlist after successful order', async () => {
    // Use a plain pinia so submitOrder runs its real implementation.
    // We spy on watchlist.add directly instead of using stubActions.
    setActivePinia(createPinia())
    mockService.placeOrder = vi.fn().mockResolvedValue({ transaction: MOCK_TX, walletBalance: null })

    const store = useWalletStore()
    const watchlist = useWatchlistStore()
    const addSpy = vi.spyOn(watchlist, 'add')

    await store.submitOrder({ ticker: 'ALI', type: 'short', amount: 3000 })

    expect(addSpy).toHaveBeenCalledWith('ALI')
  })

  // ── credit ─────────────────────────────────────────────────────────────────

  it('credit adds amount to balance', () => {
    const store = useWalletStore()
    store.credit(5000)
    expect(store.balance).toBe(105_000)
  })

  it('credit can be called multiple times', () => {
    const store = useWalletStore()
    store.credit(1000)
    store.credit(2000)
    expect(store.balance).toBe(103_000)
  })
})
