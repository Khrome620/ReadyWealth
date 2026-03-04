import type { IOrderService, PlaceOrderResult } from './IOrderService'
import type { Order, Transaction, OrderType } from '../types'

export class ApiOrderService implements IOrderService {
  async placeOrder(order: Order): Promise<PlaceOrderResult> {
    const idempotencyKey = crypto.randomUUID()
    const res = await fetch('/api/v1/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ticker: order.ticker,
        type: order.type,
        amount: order.amount,
        idempotencyKey,
      }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error((body as { error?: string }).error ?? `Order failed (HTTP ${res.status})`)
    }
    const data = await res.json()
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
    const res = await fetch('/api/v1/wallet')
    if (!res.ok) return null
    const data = await res.json()
    return (data.balance as number) ?? null
  }

  async getOrders(): Promise<Transaction[]> {
    const res = await fetch('/api/v1/orders')
    if (!res.ok) return []
    const data = await res.json() as Array<{
      orderId: string
      ticker: string
      type: string
      amount: number
      placedAt: string
      status: string
    }>
    return data.map(o => ({
      id: o.orderId,
      ticker: o.ticker,
      type: o.type.toLowerCase() as OrderType,
      amount: o.amount,
      date: o.placedAt,
      status: (o.status ?? 'open') as Transaction['status'],
    }))
  }
}
