import type { IOrderService, PlaceOrderResult } from './IOrderService'
import type { Order, Transaction } from '../types'

export class PaperOrderService implements IOrderService {
  async placeOrder(order: Order): Promise<PlaceOrderResult> {
    const transaction: Transaction = {
      id: crypto.randomUUID(),
      ticker: order.ticker,
      type: order.type,
      amount: order.amount,
      date: new Date().toISOString(),
      status: 'open',
    }
    // walletBalance: null → caller (wallet store) handles balance deduction locally
    return { transaction, walletBalance: null }
  }

  async fetchBalance(): Promise<number | null> {
    return null
  }

  async deposit(_amount: number): Promise<number | null> {
    // No backend in mock mode — caller handles locally
    return null
  }

  async getOrders(): Promise<Transaction[]> {
    return []
  }
}

export const paperOrderService = new PaperOrderService()
