import type { Order, Transaction } from '../types'

export interface IOrderService {
  submitOrder(order: Order, availableBalance: number): Promise<Transaction>
}
