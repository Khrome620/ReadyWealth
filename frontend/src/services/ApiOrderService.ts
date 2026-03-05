import { api } from './AuthService'
import type { IOrderService, PlaceOrderResult } from './IOrderService'
import type { Order, Transaction, OrderType } from '../types'

export class ApiOrderService implements IOrderService {
  async placeOrder(order: Order): Promise<PlaceOrderResult> {
    const idempotencyKey = crypto.randomUUID()
    const { data } = await api.post('/api/v1/orders', {
      ticker: order.ticker,
      type: order.type,
      amount: order.amount,
      idempotencyKey,
    })
    const transaction: Transaction = {
      id: data.orderId,
      ticker: data.ticker,
      type: (data.type as string).toLowerCase() as OrderType,
      amount: data.amount,
      date: data.placedAt,
      status: 'open',
    }
    return { transaction, walletBalance: data.walletBalance as number }
  }

  async fetchBalance(): Promise<number | null> {
    try {
      const { data } = await api.get('/api/v1/wallet')
      return (data.balance as number) ?? null
    } catch {
      return null
    }
  }

  async deposit(amount: number): Promise<number | null> {
    try {
      const { data } = await api.post('/api/v1/wallet/deposit', { amount })
      return (data.balance as number) ?? null
    } catch {
      return null
    }
  }

  async getOrders(): Promise<Transaction[]> {
    try {
      const { data } = await api.get<Array<{
        orderId: string
        ticker: string
        type: string
        amount: number
        placedAt: string
        status: string
      }>>('/api/v1/orders')
      return data.map(o => ({
        id: o.orderId,
        ticker: o.ticker,
        type: o.type.toLowerCase() as OrderType,
        amount: o.amount,
        date: o.placedAt,
        status: (o.status ?? 'open') as Transaction['status'],
      }))
    } catch {
      return []
    }
  }
}
