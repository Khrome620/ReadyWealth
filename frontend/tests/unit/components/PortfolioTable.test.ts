import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import PortfolioTable from '../../../src/components/portfolio/PortfolioTable.vue'

vi.mock('../../../src/services/MockMarketService', () => ({
  mockMarketService: {
    getStocks: vi.fn().mockResolvedValue([]),
    isMarketOpen: vi.fn().mockReturnValue(true),
  },
}))

vi.mock('../../../src/services/PaperOrderService', () => ({
  paperOrderService: {
    placeOrder: vi.fn(),
    fetchBalance: vi.fn().mockResolvedValue(null),
    getOrders: vi.fn().mockResolvedValue([]),
  },
}))

vi.mock('../../../src/composables/useSnack', () => ({
  useSnack: () => ({
    showSuccess: vi.fn(),
    showDanger: vi.fn(),
    showInfo: vi.fn(),
  }),
}))

// ── Stubs ─────────────────────────────────────────────────────────────────────

const STUBS = {
  SprTable: {
    name: 'SprTable',
    template: `
      <div class="spr-table">
        <div v-if="!dataTable || dataTable.length === 0" class="table-empty">
          <slot name="empty-state" />
        </div>
        <div v-else class="rows">
          <div v-for="(row, i) in dataTable" :key="i" class="row">
            <span class="cell-ticker">{{ row.ticker }}</span>
            <span class="cell-pnl-tone" :class="row.pnl && row.pnl.title ? row.pnl.title.tone : ''">
              {{ row.pnl && row.pnl.title ? row.pnl.title.label : '' }}
            </span>
          </div>
          <slot v-for="(row, i) in dataTable" :key="'action-' + i" name="action" :row="row" />
        </div>
      </div>`,
    props: ['headers', 'dataTable', 'variant', 'fullHeight', 'action'],
  },
  SprEmptyState: {
    name: 'SprEmptyState',
    template: `<div class="spr-empty-state">{{ description }}</div>`,
    props: ['image', 'description', 'subDescription', 'size', 'hasButton'],
  },
  SprButton: {
    name: 'SprButton',
    template: `<button class="spr-btn" :disabled="disabled" @click="$emit('click')"><slot /></button>`,
    props: ['tone', 'variant', 'size', 'disabled'],
    emits: ['click'],
  },
  SprModal: {
    name: 'SprModal',
    template: `<div class="spr-modal" v-if="modelValue"><slot /><slot name="footer" /></div>`,
    props: ['modelValue', 'title', 'size', 'staticBackdrop'],
    emits: ['update:modelValue'],
  },
}

// ── Positions data ─────────────────────────────────────────────────────────────

const POSITIONS_WITH_PNL = [
  {
    id: 'pos-1', ticker: 'SM', type: 'long' as const,
    investedAmount: 9120, shares: 10, entryPrice: 912, currentPrice: 950,
    currentValue: 9500, pnl: 380,
  },
  {
    id: 'pos-2', ticker: 'ALI', type: 'short' as const,
    investedAmount: 2800, shares: 100, entryPrice: 28, currentPrice: 30,
    currentValue: 3000, pnl: -200,  // loss for short when price rises
  },
]

function createWrapper(positionsOverride?: typeof POSITIONS_WITH_PNL) {
  return mount(PortfolioTable, {
    global: {
      plugins: [
        createTestingPinia({
          stubActions: true,
          createSpy: vi.fn,
          initialState: {
            positions: { openPositions: positionsOverride?.map(p => ({
              id: p.id, ticker: p.ticker, type: p.type,
              investedAmount: p.investedAmount, shares: p.shares,
              entryPrice: p.entryPrice, currentPrice: p.currentPrice,
            })) ?? [] },
            market: {
              stocks: [
                { ticker: 'SM', name: 'SM Corp.', price: 950, change: 38, changePct: 4.17, volume: 1000000 },
                { ticker: 'ALI', name: 'ALI Corp.', price: 30, change: 2, changePct: 7.14, volume: 500000 },
              ],
            },
            wallet: { balance: 100_000 },
          },
        }),
      ],
      stubs: STUBS,
    },
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('PortfolioTable', () => {
  // ── Empty state ─────────────────────────────────────────────────────────────

  it('shows empty state when no positions', () => {
    const wrapper = createWrapper([])
    expect(wrapper.find('.spr-empty-state').exists()).toBe(true)
    expect(wrapper.find('.spr-empty-state').text()).toContain('No open positions')
  })

  it('does not show empty state when positions exist', () => {
    const wrapper = createWrapper(POSITIONS_WITH_PNL)
    expect(wrapper.find('.spr-empty-state').exists()).toBe(false)
  })

  // ── Rows render ──────────────────────────────────────────────────────────────

  it('renders one row per position', () => {
    const wrapper = createWrapper(POSITIONS_WITH_PNL)
    expect(wrapper.findAll('.row')).toHaveLength(POSITIONS_WITH_PNL.length)
  })

  it('renders ticker in each row', () => {
    const wrapper = createWrapper(POSITIONS_WITH_PNL)
    const tickers = wrapper.findAll('.cell-ticker').map(w => w.text())
    expect(tickers).toContain('SM')
    expect(tickers).toContain('ALI')
  })

  // ── P&L tone ─────────────────────────────────────────────────────────────────

  it('positive P&L has success tone (green)', () => {
    const wrapper = createWrapper(POSITIONS_WITH_PNL)
    // SM has pnl = +380 → tone should be 'success'
    const pnlCells = wrapper.findAll('.cell-pnl-tone')
    const smPnl = pnlCells[0]
    expect(smPnl.classes()).toContain('success')
  })

  it('negative P&L has danger tone (red)', () => {
    const wrapper = createWrapper(POSITIONS_WITH_PNL)
    // ALI has pnl = -200 → tone should be 'danger'
    const pnlCells = wrapper.findAll('.cell-pnl-tone')
    const aliPnl = pnlCells[1]
    expect(aliPnl.classes()).toContain('danger')
  })

  // ── Table renders ─────────────────────────────────────────────────────────────

  it('renders a table element', () => {
    const wrapper = createWrapper()
    expect(wrapper.find('.spr-table').exists()).toBe(true)
  })
})
