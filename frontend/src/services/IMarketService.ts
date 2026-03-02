import type { Stock } from '../types'

export interface IMarketService {
  getStocks(): Promise<Stock[]>
  isMarketOpen(): boolean
}
