import type { IMarketService } from './IMarketService'
import type { Stock } from '../types'

/**
 * Production market service: fetches live (mock-backend) PSE data from
 * GET /api/v1/stocks.  `isMarketOpen()` returns the value reported by the
 * last successful fetch; `false` before the first fetch completes.
 */
export class ApiMarketService implements IMarketService {
  private _marketOpen = false

  async getStocks(): Promise<Stock[]> {
    const res = await fetch('/api/v1/stocks')
    if (!res.ok) throw new Error(`Market data unavailable (HTTP ${res.status})`)
    const data = await res.json()
    this._marketOpen = data.marketOpen as boolean
    return (data.stocks as Array<{
      ticker: string
      name: string
      price: number
      change: number
      changePct: number
      volume: number
    }>).map(s => ({
      ticker: s.ticker,
      name: s.name,
      price: s.price,
      change: s.change,
      changePct: s.changePct,
      volume: s.volume,
    }))
  }

  isMarketOpen(): boolean {
    return this._marketOpen
  }
}
