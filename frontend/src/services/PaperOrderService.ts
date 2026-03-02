import type { IOrderService } from './IOrderService'
import type { Order, Transaction } from '../types'

export class PaperOrderService implements IOrderService {
  async submitOrder(order: Order, availableBalance: number): Promise<Transaction> {
    if (order.amount <= 0) throw new Error('Amount must be greater than zero.')
    if (order.amount > availableBalance) throw new Error('Insufficient balance.')

    const transaction: Transaction = {
      id: crypto.randomUUID(),
      ticker: order.ticker,
      type: order.type,
      amount: order.amount,
      date: new Date().toISOString(),
      status: 'completed',
    }
    return transaction
  }
}

export const paperOrderService = new PaperOrderService()
