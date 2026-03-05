import type { Order, Transaction } from '../types'

export interface PlaceOrderResult {
  transaction: Transaction
  /** Updated wallet balance from the server. `null` means calculate locally. */
  walletBalance: number | null
}

export interface IOrderService {
  placeOrder(order: Order): Promise<PlaceOrderResult>
  /** Returns server-side balance, or `null` when unavailable (use local default). */
  fetchBalance(): Promise<number | null>
  /** Adds amount to wallet on the server. Returns new balance, or `null` on failure. */
  deposit(amount: number): Promise<number | null>
  getOrders(): Promise<Transaction[]>
}
