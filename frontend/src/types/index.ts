export interface Stock {
  ticker: string
  name: string
  price: number
  change: number
  changePct: number
  volume: number
}

export interface Wallet {
  balance: number
}

export type OrderType = 'long' | 'short'

export interface Order {
  ticker: string
  type: OrderType
  amount: number
}

export interface Position {
  id: string
  ticker: string
  type: OrderType
  investedAmount: number
  shares: number
  entryPrice: number
  currentPrice: number
}

export interface Transaction {
  id: string
  ticker: string
  type: OrderType
  amount: number
  date: string
  status: 'pending' | 'open' | 'closed'
  realizedPnl?: number
}

export interface Recommendation {
  ticker: string
  name: string
  currentPrice: number
  reason: string
  confidence: 'high' | 'medium' | 'low'
}
