import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { usePositionsStore } from '../../../src/stores/positions'
import { useMarketStore } from '../../../src/stores/market'
import { useWalletStore } from '../../../src/stores/wallet'
import type { Stock } from '../../../src/types'

vi.mock('../../../src/services/MockMarketService', () => ({
  mockMarketService: {
    getStocks: vi.fn().mockResolvedValue([]),
    isMarketOpen: vi.fn().mockReturnValue(false),
  },
}))

vi.mock('../../../src/services/PaperOrderService', () => ({
  paperOrderService: {
    placeOrder: vi.fn(),
    fetchBalance: vi.fn().mockResolvedValue(null),
    getOrders: vi.fn().mockResolvedValue([]),
  },
}))

vi.mock('../../../src/composables/useSnack', () => ({
  useSnack: () => ({
    showSuccess: vi.fn(),
    showDanger: vi.fn(),
    showInfo: vi.fn(),
  }),
}))

// ── Fixtures ──────────────────────────────────────────────────────────────────

function stock(ticker: string, price: number): Stock {
  return { ticker, name: `${ticker} Corp.`, price, change: 0, changePct: 0, volume: 1_000_000 }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('usePositionsStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    global.fetch = vi.fn()
  })

  // ── Long P&L formula ───────────────────────────────────────────────────────

  it('positionsWithCurrentValue: Long pnl = currentValue − investedAmount', () => {
    const market = useMarketStore()
    market.stocks = [stock('SM', 950)]  // price rose from entry 912

    const positions = usePositionsStore()
    positions.openPositions = [{
      id: 'pos-1', ticker: 'SM', type: 'long',
      investedAmount: 9120, shares: 10, entryPrice: 912, currentPrice: 912,
    }]

    const [pos] = positions.positionsWithCurrentValue
    expect(pos.currentValue).toBeCloseTo(9500, 1)   // 10 × 950
    expect(pos.pnl).toBeCloseTo(380, 1)              // 9500 - 9120
  })

  // ── Short P&L formula ──────────────────────────────────────────────────────

  it('positionsWithCurrentValue: Short pnl = investedAmount − currentValue (profit on fall)', () => {
    const market = useMarketStore()
    market.stocks = [stock('SM', 850)]  // price fell from entry 912

    const positions = usePositionsStore()
    positions.openPositions = [{
      id: 'pos-2', ticker: 'SM', type: 'short',
      investedAmount: 9120, shares: 10, entryPrice: 912, currentPrice: 912,
    }]

    const [pos] = positions.positionsWithCurrentValue
    expect(pos.currentValue).toBeCloseTo(8500, 1)    // 10 × 850
    expect(pos.pnl).toBeCloseTo(620, 1)              // 9120 - 8500 = positive (profit)
  })

  it('positionsWithCurrentValue: Short pnl is negative when price rises', () => {
    const market = useMarketStore()
    market.stocks = [stock('SM', 970)]  // price rose (bad for short)

    const positions = usePositionsStore()
    positions.openPositions = [{
      id: 'pos-3', ticker: 'SM', type: 'short',
      investedAmount: 9120, shares: 10, entryPrice: 912, currentPrice: 912,
    }]

    const [pos] = positions.positionsWithCurrentValue
    expect(pos.pnl).toBeLessThan(0)  // 9120 - 9700 = -580
  })

  // ── Recomputes when market stocks change ───────────────────────────────────

  it('positionsWithCurrentValue recomputes when market.stocks updates', () => {
    const market = useMarketStore()
    market.stocks = [stock('ALI', 28)]

    const positions = usePositionsStore()
    positions.openPositions = [{
      id: 'pos-4', ticker: 'ALI', type: 'long',
      investedAmount: 2800, shares: 100, entryPrice: 28, currentPrice: 28,
    }]

    expect(positions.positionsWithCurrentValue[0].currentValue).toBeCloseTo(2800, 0)

    // Market price updates
    market.stocks = [stock('ALI', 30)]

    expect(positions.positionsWithCurrentValue[0].currentValue).toBeCloseTo(3000, 0)
    expect(positions.positionsWithCurrentValue[0].pnl).toBeCloseTo(200, 0)
  })

  // ── closePosition — API mode ───────────────────────────────────────────────

  it('closePosition removes position from list on API success', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ realizedPnl: 380, walletBalance: 100380 }),
    } as Response)

    const positions = usePositionsStore()
    positions.openPositions = [{
      id: 'pos-api', ticker: 'SM', type: 'long',
      investedAmount: 9120, shares: 10, entryPrice: 912, currentPrice: 950,
    }]

    await positions.closePosition('pos-api')
    expect(positions.openPositions).toHaveLength(0)
  })

  it('closePosition credits wallet from API realizedPnl', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ realizedPnl: 380, walletBalance: 100380 }),
    } as Response)

    const wallet = useWalletStore()
    const initialBalance = wallet.balance

    const positions = usePositionsStore()
    positions.openPositions = [{
      id: 'pos-credit', ticker: 'SM', type: 'long',
      investedAmount: 9120, shares: 10, entryPrice: 912, currentPrice: 950,
    }]

    await positions.closePosition('pos-credit')
    expect(wallet.balance).toBe(initialBalance + 380)
  })

  // ── closePosition — local fallback (mock mode) ─────────────────────────────

  it('closePosition uses local fallback when API returns error', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 404 } as Response)

    const market = useMarketStore()
    market.stocks = [stock('SM', 950)]

    const positions = usePositionsStore()
    positions.openPositions = [{
      id: 'pos-local', ticker: 'SM', type: 'long',
      investedAmount: 9120, shares: 10, entryPrice: 912, currentPrice: 912,
    }]

    const pnl = await positions.closePosition('pos-local')
    expect(positions.openPositions).toHaveLength(0)
    expect(pnl).toBeCloseTo(380, 0)  // 9500 - 9120
  })

  it('closePosition returns 0 when position not found', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network failure'))

    const positions = usePositionsStore()
    const pnl = await positions.closePosition('nonexistent')
    expect(pnl).toBe(0)
  })

  // ── fetchPositions ─────────────────────────────────────────────────────────

  it('fetchPositions populates openPositions from API', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        positions: [
          {
            orderId: 'ord-1', ticker: 'SM', type: 'long',
            investedAmount: 9120, shares: 10, entryPrice: 912, currentPrice: 950,
          },
        ],
      }),
    } as Response)

    const positions = usePositionsStore()
    await positions.fetchPositions()

    expect(positions.openPositions).toHaveLength(1)
    expect(positions.openPositions[0].id).toBe('ord-1')
  })
})
