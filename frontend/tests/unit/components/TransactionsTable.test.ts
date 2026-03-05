import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import TransactionsTable from '../../../src/components/transactions/TransactionsTable.vue'
import type { Transaction } from '../../../src/types'

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeTx(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 'tx-001',
    ticker: 'SM',
    type: 'long',
    amount: 5000,
    date: '2026-03-03T09:00:00.000Z',
    status: 'open',
    ...overrides,
  }
}

function createWrapper(txs: Transaction[] = []) {
  return mount(TransactionsTable, {
    global: {
      plugins: [
        createTestingPinia({
          stubActions: true,
          createSpy: vi.fn,
          initialState: {
            transactions: { transactions: txs },
          },
        }),
      ],
    },
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('TransactionsTable', () => {
  // ── Empty state ─────────────────────────────────────────────────────────────

  it('shows empty state when no transactions', () => {
    const wrapper = createWrapper([])
    expect(wrapper.find('.tt-empty').exists()).toBe(true)
    expect(wrapper.find('.tt-empty').text()).toContain('No transactions')
  })

  it('does not show rows when no transactions', () => {
    const wrapper = createWrapper([])
    expect(wrapper.findAll('.tt-row')).toHaveLength(0)
  })

  // ── With transactions ────────────────────────────────────────────────────────

  it('renders one row per transaction', () => {
    const wrapper = createWrapper([makeTx({ id: 'tx-1' }), makeTx({ id: 'tx-2' })])
    expect(wrapper.findAll('.tt-row')).toHaveLength(2)
  })

  it('does not show empty state when transactions exist', () => {
    const wrapper = createWrapper([makeTx()])
    expect(wrapper.find('.tt-empty').exists()).toBe(false)
  })

  it('renders ticker in each row', () => {
    const wrapper = createWrapper([makeTx({ ticker: 'ALI' })])
    expect(wrapper.find('.tt-ticker').text()).toBe('ALI')
  })

  it('renders amount in each row', () => {
    const wrapper = createWrapper([makeTx({ amount: 9000 })])
    // tt-num is used for both th and td; find the first td.tt-num which is the amount cell
    expect(wrapper.find('td.tt-num').text()).toContain('9')
  })

  // ── Status display ───────────────────────────────────────────────────────────

  it('displays OPEN label for open transactions', () => {
    const wrapper = createWrapper([makeTx({ status: 'open' })])
    expect(wrapper.find('.tt-status').text()).toBe('OPEN')
  })

  it('displays CLOSED label for closed transactions', () => {
    const wrapper = createWrapper([makeTx({ status: 'closed' })])
    expect(wrapper.find('.tt-status').text()).toBe('CLOSED')
  })

  it('displays PENDING label for pending transactions', () => {
    const wrapper = createWrapper([makeTx({ status: 'pending' })])
    expect(wrapper.find('.tt-status').text()).toBe('PENDING')
  })

  // ── Column headers ───────────────────────────────────────────────────────────

  it('renders a table element', () => {
    const wrapper = createWrapper([makeTx()])
    expect(wrapper.find('.tt-table').exists()).toBe(true)
  })
})
