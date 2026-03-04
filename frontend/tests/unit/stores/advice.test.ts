import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAdviceStore } from '../../../src/stores/advice'
import { useMarketStore } from '../../../src/stores/market'
import type { Stock } from '../../../src/types'

vi.mock('../../../src/services/MockMarketService', () => ({
  mockMarketService: {
    getStocks: vi.fn().mockResolvedValue([]),
    isMarketOpen: vi.fn().mockReturnValue(false),
  },
}))

// ── Fixtures ──────────────────────────────────────────────────────────────────

function stock(ticker: string, changePct: number, volume: number, price = 100): Stock {
  return { ticker, name: `${ticker} Corp.`, price, change: 0, changePct, volume }
}

const STOCKS: Stock[] = [
  stock('A', 5.0,  1_000),   // mover #1 — high  (>3%)
  stock('B', 4.0,  2_000),   // mover #2 — high
  stock('C', 2.0,  3_000),   // mover #3 — medium (1-3%)
  stock('D', 1.5,  4_000),   // mover #4 — bumped out
  stock('E', 0.0,  9_000),   // top volume #1 (not a mover)
  stock('F', -1.0, 8_000),   // top volume #2 (negative changePct → not a mover)
  stock('G', -2.0,   100),   // irrelevant
]

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useAdviceStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  // ── empty state ─────────────────────────────────────────────────────────────

  it('returns empty array when market has no stocks', () => {
    const advice = useAdviceStore()
    expect(advice.recommendations).toHaveLength(0)
  })

  // ── computed from market data ────────────────────────────────────────────────

  it('returns recommendations when market stocks are loaded', () => {
    const market = useMarketStore()
    market.stocks = STOCKS

    const advice = useAdviceStore()
    expect(advice.recommendations.length).toBeGreaterThanOrEqual(3)
  })

  it('top 3 movers have "Strong upward momentum" reason', () => {
    const market = useMarketStore()
    market.stocks = STOCKS

    const advice = useAdviceStore()
    const movers = advice.recommendations.filter(r => r.reason === 'Strong upward momentum')
    expect(movers).toHaveLength(3)
    const tickers = movers.map(r => r.ticker)
    expect(tickers).toContain('A')
    expect(tickers).toContain('B')
    expect(tickers).toContain('C')
  })

  it('top 2 volume entries have "High trading activity" reason', () => {
    const market = useMarketStore()
    market.stocks = STOCKS

    const advice = useAdviceStore()
    const volume = advice.recommendations.filter(r => r.reason === 'High trading activity')
    expect(volume).toHaveLength(2)
    const tickers = volume.map(r => r.ticker)
    expect(tickers).toContain('E')
    expect(tickers).toContain('F')
  })

  it('returns max 5 recommendations', () => {
    const market = useMarketStore()
    market.stocks = STOCKS

    const advice = useAdviceStore()
    expect(advice.recommendations.length).toBeLessThanOrEqual(5)
  })

  it('volume entries do not overlap with mover tickers', () => {
    const market = useMarketStore()
    market.stocks = STOCKS

    const advice = useAdviceStore()
    const moverTickers = new Set(
      advice.recommendations.filter(r => r.reason === 'Strong upward momentum').map(r => r.ticker),
    )
    const volumeTickers = advice.recommendations
      .filter(r => r.reason === 'High trading activity')
      .map(r => r.ticker)

    expect(volumeTickers.every(t => !moverTickers.has(t))).toBe(true)
  })

  it('confidence is "high" when changePct > 3', () => {
    const market = useMarketStore()
    market.stocks = STOCKS

    const advice = useAdviceStore()
    const a = advice.recommendations.find(r => r.ticker === 'A')
    expect(a?.confidence).toBe('high')
  })

  it('confidence is "medium" when changePct is between 1 and 3', () => {
    const market = useMarketStore()
    market.stocks = STOCKS

    const advice = useAdviceStore()
    const c = advice.recommendations.find(r => r.ticker === 'C')
    expect(c?.confidence).toBe('medium')
  })

  // ── fetchRecommendations — API mode ──────────────────────────────────────────

  it('fetchRecommendations sets generatedAt on successful response', async () => {
    const RECS = [
      { ticker: 'SM', name: 'SM Investments', currentPrice: 912, reason: 'Strong upward momentum', confidence: 'high' },
      { ticker: 'ALI', name: 'Ayala Land', currentPrice: 28, reason: 'Strong upward momentum', confidence: 'medium' },
      { ticker: 'BDO', name: 'BDO', currentPrice: 130, reason: 'Strong upward momentum', confidence: 'medium' },
    ]
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({
        recommendations: RECS,
        generatedAt: '2026-03-03T09:00:00Z',
        disclaimer: 'Not financial advice',
      }),
    } as Response)

    const advice = useAdviceStore()
    await advice.fetchRecommendations()

    expect(advice.generatedAt).toBe('2026-03-03T09:00:00Z')
    expect(advice.recommendations).toHaveLength(3)
    expect(advice.recommendations[0].ticker).toBe('SM')
  })

  it('fetchRecommendations sets unavailableUntil on 503', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: () => Promise.resolve({
        error: 'Recommendations unavailable',
        retryAfter: '2026-03-03T10:00:00Z',
      }),
    } as Response)

    const market = useMarketStore()
    market.stocks = STOCKS

    const advice = useAdviceStore()
    await advice.fetchRecommendations()

    expect(advice.unavailableUntil).toBe('2026-03-03T10:00:00Z')
    // Falls back to computed
    expect(advice.recommendations.length).toBeGreaterThan(0)
  })

  it('fetchRecommendations falls back to computed on network error', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network failure'))

    const market = useMarketStore()
    market.stocks = STOCKS

    const advice = useAdviceStore()
    await advice.fetchRecommendations()

    expect(advice.recommendations.length).toBeGreaterThan(0)
  })
})
