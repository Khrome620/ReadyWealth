import type { Stock } from '../types'

export interface PricePoint {
  time: number | string  // UTCTimestamp (intraday) or YYYY-MM-DD (daily)
  value: number
}

export interface CandlePoint {
  time: number | string
  open: number
  high: number
  low: number
  close: number
}

export type TimeRange = '1D' | '7D' | '1M' | '1Y' | 'YTD' | 'ALL'

// Module-level caches keyed by ticker or ticker+range
const lineCache   = new Map<string, PricePoint[]>()
const candleCache = new Map<string, CandlePoint[]>()

// xorshift32 PRNG — deterministic, seeded by ticker
function makeRng(seed: number): () => number {
  let s = seed >>> 0 || 1
  return () => {
    s ^= s << 13
    s ^= s >>> 17
    s ^= s << 5
    return (s >>> 0) / 0xffffffff
  }
}

function tickerSeed(ticker: string): number {
  let h = 0
  for (let i = 0; i < ticker.length; i++) {
    h = (Math.imul(31, h) + ticker.charCodeAt(i)) | 0
  }
  return h >>> 0
}

function sessionBounds() {
  const nowSec = Math.floor(Date.now() / 1000)
  const todayUTC = new Date()
  todayUTC.setUTCHours(0, 0, 0, 0)
  const openUTC  = todayUTC.getTime() / 1000 + 1 * 3600 + 30 * 60  // 09:30 PHT
  const closeUTC = todayUTC.getTime() / 1000 + 7 * 3600 + 30 * 60  // 15:30 PHT
  const endUTC   = nowSec < openUTC ? closeUTC : Math.min(nowSec, closeUTC)
  return { openUTC, closeUTC, endUTC }
}

// ─── Intraday (1D) ───────────────────────────────────────────────────────────

function buildIntradayLine(stock: Stock): PricePoint[] {
  const rng = makeRng(tickerSeed(stock.ticker))
  const { openUTC, endUTC } = sessionBounds()
  const basePrice = stock.price - stock.change

  const points: PricePoint[] = []
  let current = basePrice
  let t = openUTC

  while (t <= endUTC) {
    points.push({ time: t, value: Math.round(current * 100) / 100 })
    current = Math.max(basePrice * 0.5, current + (rng() - 0.5) * basePrice * 0.003)
    t += 60
  }

  if (points.length === 0) points.push({ time: openUTC, value: basePrice })

  // Interpolate last 10 points to land exactly on current price
  const n = points.length
  const interpCount = Math.min(10, n)
  const interpStart = n - interpCount
  const startVal = points[interpStart].value
  for (let i = 0; i < interpCount; i++) {
    const frac = (i + 1) / interpCount
    points[interpStart + i].value = Math.round((startVal + (stock.price - startVal) * frac) * 100) / 100
  }

  return points
}

// ─── Multi-day (7D / 1M / 1Y / YTD) — one point per calendar day ────────────

function daysForRange(range: Exclude<TimeRange, '1D'>): number {
  const now = new Date()
  if (range === '7D')  return 7
  if (range === '1M')  return 30
  if (range === '1Y')  return 365
  if (range === 'ALL') return 365 * 5   // 5 years of history
  // YTD: Jan 1 to today
  const jan1 = new Date(now.getFullYear(), 0, 1)
  return Math.max(1, Math.ceil((now.getTime() - jan1.getTime()) / 86_400_000))
}

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10) // YYYY-MM-DD
}

function buildMultiDayLine(stock: Stock, range: Exclude<TimeRange, '1D'>): PricePoint[] {
  const days = daysForRange(range)
  const rng = makeRng(tickerSeed(stock.ticker) ^ (range.charCodeAt(0) * 0x9e3779b9))

  // Walk backwards from current price, then reverse
  const prices: number[] = [stock.price]
  for (let i = 0; i < days; i++) {
    const prev = prices[0]
    const step = (rng() - 0.5) * prev * 0.03
    prices.unshift(Math.max(prev * 0.3, prev - step))
  }

  // Generate one YYYY-MM-DD date per day going backwards from today
  const dates: string[] = []
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)
  for (let i = days; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 86_400_000)
    dates.push(toDateStr(d))
  }

  return prices.map((value, i) => ({
    time: dates[i],
    value: Math.round(value * 100) / 100,
  }))
}

// ─── Candles (derived from line, with OHLC noise) ────────────────────────────

function lineToCandles(points: PricePoint[], spreadPct: number, wickPct: number, seedXor: number, ticker: string): CandlePoint[] {
  const rng = makeRng(tickerSeed(ticker) ^ seedXor)
  return points.map((pt) => {
    const mid   = pt.value
    const open  = Math.round((mid + (rng() - 0.5) * mid * spreadPct) * 100) / 100
    const close = Math.round((mid + (rng() - 0.5) * mid * spreadPct) * 100) / 100
    const high  = Math.round((Math.max(open, close) + rng() * mid * wickPct) * 100) / 100
    const low   = Math.round((Math.min(open, close) - rng() * mid * wickPct) * 100) / 100
    return { time: pt.time, open, high, low, close }
  })
}

// ─── Public API ──────────────────────────────────────────────────────────────

export function generateRangeLineHistory(stock: Stock, range: TimeRange): PricePoint[] {
  const key = `${stock.ticker}-${range}`
  if (lineCache.has(key)) return lineCache.get(key)!

  const points = range === '1D'
    ? buildIntradayLine(stock)
    : buildMultiDayLine(stock, range)

  lineCache.set(key, points)
  return points
}

export function generateRangeCandleHistory(stock: Stock, range: TimeRange): CandlePoint[] {
  const key = `${stock.ticker}-${range}`
  if (candleCache.has(key)) return candleCache.get(key)!

  const linePoints = generateRangeLineHistory(stock, range)
  // Intraday uses tight spread; multi-day uses wider daily spread
  const [spread, wick, xor] = range === '1D'
    ? [0.002, 0.003, 0xdeadbeef]
    : [0.008, 0.014, 0xbeefdead]

  const candles = lineToCandles(linePoints, spread, wick, xor, stock.ticker)
  candleCache.set(key, candles)
  return candles
}

// Keep old names working for any remaining callers
export const generateIntradayHistory       = (s: Stock) => generateRangeLineHistory(s, '1D')
export const generateIntradayCandleHistory = (s: Stock) => generateRangeCandleHistory(s, '1D')
