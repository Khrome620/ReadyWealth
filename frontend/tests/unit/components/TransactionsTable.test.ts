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

const STUBS = {
  SprTable: {
    name: 'SprTable',
    template: `<div class="spr-table">
      <div v-if="dataTable && dataTable.length === 0" class="empty">
        <slot name="empty-state" />
      </div>
      <div v-else class="rows">
        <div v-for="(row, i) in dataTable" :key="i" class="row">
          <span class="cell-ticker">{{ row.ticker }}</span>
          <span class="cell-type">{{ row.type && row.type.title ? row.type.title.label : row.type }}</span>
          <span class="cell-amount">{{ row.amount }}</span>
          <span class="cell-date">{{ row.date }}</span>
          <span class="cell-status">{{ row.status && row.status.title ? row.status.title.label : row.status }}</span>
        </div>
      </div>
    </div>`,
    props: ['headers', 'dataTable', 'variant', 'fullHeight'],
  },
  SprEmptyState: {
    name: 'SprEmptyState',
    template: `<div class="spr-empty-state">{{ description }}</div>`,
    props: ['image', 'description', 'subDescription', 'size'],
  },
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
      stubs: STUBS,
    },
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('TransactionsTable', () => {
  // ── Empty state ─────────────────────────────────────────────────────────────

  it('shows empty state when no transactions', () => {
    const wrapper = createWrapper([])
    expect(wrapper.find('.spr-empty-state').exists()).toBe(true)
    expect(wrapper.find('.spr-empty-state').text()).toContain('No transactions')
  })

  it('does not show rows when no transactions', () => {
    const wrapper = createWrapper([])
    expect(wrapper.findAll('.row')).toHaveLength(0)
  })

  // ── With transactions ────────────────────────────────────────────────────────

  it('renders one row per transaction', () => {
    const wrapper = createWrapper([makeTx({ id: 'tx-1' }), makeTx({ id: 'tx-2' })])
    expect(wrapper.findAll('.row')).toHaveLength(2)
  })

  it('does not show empty state when transactions exist', () => {
    const wrapper = createWrapper([makeTx()])
    expect(wrapper.find('.spr-empty-state').exists()).toBe(false)
  })

  it('renders ticker in each row', () => {
    const wrapper = createWrapper([makeTx({ ticker: 'ALI' })])
    expect(wrapper.find('.cell-ticker').text()).toBe('ALI')
  })

  it('renders amount in each row', () => {
    const wrapper = createWrapper([makeTx({ amount: 9000 })])
    expect(wrapper.find('.cell-amount').text()).toContain('9')
  })

  // ── Status display ───────────────────────────────────────────────────────────

  it('displays OPEN label for open transactions', () => {
    const wrapper = createWrapper([makeTx({ status: 'open' })])
    expect(wrapper.find('.cell-status').text()).toBe('OPEN')
  })

  it('displays CLOSED label for closed transactions', () => {
    const wrapper = createWrapper([makeTx({ status: 'closed' })])
    expect(wrapper.find('.cell-status').text()).toBe('CLOSED')
  })

  it('displays PENDING label for pending transactions', () => {
    const wrapper = createWrapper([makeTx({ status: 'pending' })])
    expect(wrapper.find('.cell-status').text()).toBe('PENDING')
  })

  // ── Column headers ───────────────────────────────────────────────────────────

  it('renders a table element', () => {
    const wrapper = createWrapper()
    expect(wrapper.find('.spr-table').exists()).toBe(true)
  })
})
