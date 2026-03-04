import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useMarketStore } from '../../../src/stores/market'
import type { Stock } from '../../../src/types'

// vi.mock is hoisted — MockMarketService module will be mocked before any import runs
vi.mock('../../../src/services/MockMarketService', () => ({
  mockMarketService: {
    getStocks: vi.fn(),
    isMarketOpen: vi.fn(),
  },
}))

import { mockMarketService } from '../../../src/services/MockMarketService'

const STOCKS: Stock[] = [
  { ticker: 'EMP', name: 'Emperador',  price: 19.5,  change: 0.5,  changePct: 2.63,  volume: 3_456_700 },
  { ticker: 'SM',  name: 'SM Corp',    price: 912.0, change: 12.0, changePct: 1.33,  volume: 1_245_300 },
  { ticker: 'ALI', name: 'Ayala Land', price: 28.5,  change: -0.4, changePct: -1.38, volume: 3_102_500 },
  { ticker: 'TEL', name: 'PLDT',       price: 1350,  change: -20,  changePct: -1.46, volume:   102_400 },
]

beforeEach(() => {
  setActivePinia(createPinia())
  vi.mocked(mockMarketService.getStocks).mockResolvedValue([...STOCKS])
  vi.mocked(mockMarketService.isMarketOpen).mockReturnValue(true)
})

describe('useMarketStore', () => {
  it('starts with empty stocks, loading=false, no error', () => {
    const store = useMarketStore()
    expect(store.stocks).toHaveLength(0)
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
    expect(store.lastUpdated).toBeNull()
  })

  it('sets loading=true during refresh then false after', async () => {
    const store = useMarketStore()
    const promise = store.refresh()
    expect(store.loading).toBe(true)
    await promise
    expect(store.loading).toBe(false)
  })

  it('populates stocks and sets lastUpdated after successful refresh', async () => {
    const store = useMarketStore()
    await store.refresh()
    expect(store.stocks).toHaveLength(4)
    expect(store.lastUpdated).toBeInstanceOf(Date)
    expect(store.error).toBeNull()
  })

  it('sets error message and loading=false when service throws', async () => {
    vi.mocked(mockMarketService.getStocks).mockRejectedValue(new Error('Network error'))
    const store = useMarketStore()
    await store.refresh()
    expect(store.error).toBe('Network error')
    expect(store.loading).toBe(false)
  })

  it('uses fallback error message for non-Error throws', async () => {
    vi.mocked(mockMarketService.getStocks).mockRejectedValue('string error')
    const store = useMarketStore()
    await store.refresh()
    expect(store.error).toBe('Failed to load market data')
  })

  it('preserves lastUpdated from previous success when a later refresh fails', async () => {
    const store = useMarketStore()
    await store.refresh()
    const savedTimestamp = store.lastUpdated

    vi.mocked(mockMarketService.getStocks).mockRejectedValue(new Error('fail'))
    await store.refresh()

    expect(store.error).toBe('fail')
    expect(store.lastUpdated).toEqual(savedTimestamp)
  })

  it('topGainers returns stocks with positive changePct sorted desc', async () => {
    const store = useMarketStore()
    await store.refresh()
    const gainers = store.topGainers

    expect(gainers.length).toBeGreaterThan(0)
    expect(gainers.every(s => s.changePct > 0)).toBe(true)
    // EMP (2.63) before SM (1.33)
    expect(gainers[0].ticker).toBe('EMP')
    expect(gainers[1].ticker).toBe('SM')
    for (let i = 0; i < gainers.length - 1; i++)
      expect(gainers[i].changePct).toBeGreaterThanOrEqual(gainers[i + 1].changePct)
  })

  it('topLosers returns stocks with negative changePct sorted asc', async () => {
    const store = useMarketStore()
    await store.refresh()
    const losers = store.topLosers

    expect(losers.length).toBeGreaterThan(0)
    expect(losers.every(s => s.changePct < 0)).toBe(true)
    // TEL (-1.46) before ALI (-1.38)
    expect(losers[0].ticker).toBe('TEL')
    expect(losers[1].ticker).toBe('ALI')
    for (let i = 0; i < losers.length - 1; i++)
      expect(losers[i].changePct).toBeLessThanOrEqual(losers[i + 1].changePct)
  })

  it('mostActive returns stocks sorted by volume desc', async () => {
    const store = useMarketStore()
    await store.refresh()
    const active = store.mostActive

    // EMP (3_456_700) → ALI (3_102_500) → SM (1_245_300) → TEL (102_400)
    expect(active[0].ticker).toBe('EMP')
    expect(active[1].ticker).toBe('ALI')
    for (let i = 0; i < active.length - 1; i++)
      expect(active[i].volume).toBeGreaterThanOrEqual(active[i + 1].volume)
  })

  it('marketOpen reflects the service return value (true)', () => {
    vi.mocked(mockMarketService.isMarketOpen).mockReturnValue(true)
    const store = useMarketStore()
    expect(store.marketOpen).toBe(true)
  })

  it('marketOpen reflects the service return value (false)', () => {
    vi.mocked(mockMarketService.isMarketOpen).mockReturnValue(false)
    const store = useMarketStore()
    expect(store.marketOpen).toBe(false)
  })
})
