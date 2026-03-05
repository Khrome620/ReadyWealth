import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
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
    currentValue: 3000, pnl: -200,
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
            positions: {
              openPositions: positionsOverride?.map(p => ({
                id: p.id, ticker: p.ticker, type: p.type,
                investedAmount: p.investedAmount, shares: p.shares,
                entryPrice: p.entryPrice, currentPrice: p.currentPrice,
              })) ?? [],
            },
            market: {
              stocks: [
                { ticker: 'SM',  name: 'SM Corp.',  price: 950, change: 38,  changePct: 4.17, volume: 1_000_000 },
                { ticker: 'ALI', name: 'ALI Corp.', price: 30,  change: 2,   changePct: 7.14, volume: 500_000 },
              ],
            },
            wallet: { balance: 100_000 },
          },
        }),
      ],
    },
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('PortfolioTable', () => {
  // ── Empty state ─────────────────────────────────────────────────────────────

  it('shows empty state when no positions', () => {
    const wrapper = createWrapper([])
    expect(wrapper.find('.pt-empty').exists()).toBe(true)
    expect(wrapper.find('.pt-empty').text()).toContain('No open positions')
  })

  it('does not show empty state when positions exist', () => {
    const wrapper = createWrapper(POSITIONS_WITH_PNL)
    expect(wrapper.find('.pt-empty').exists()).toBe(false)
  })

  // ── Rows render ──────────────────────────────────────────────────────────────

  it('renders one row per position', () => {
    const wrapper = createWrapper(POSITIONS_WITH_PNL)
    expect(wrapper.findAll('.pt-row')).toHaveLength(POSITIONS_WITH_PNL.length)
  })

  it('renders ticker in each row', () => {
    const wrapper = createWrapper(POSITIONS_WITH_PNL)
    const tickers = wrapper.findAll('.pt-ticker').map(w => w.text())
    expect(tickers).toContain('SM')
    expect(tickers).toContain('ALI')
  })

  // ── P&L tone ─────────────────────────────────────────────────────────────────

  it('positive P&L has success tone (green)', () => {
    const wrapper = createWrapper(POSITIONS_WITH_PNL)
    // SM has pnl = +380 → cell should have pt-gain class
    const pnlCells = wrapper.findAll('td.pt-num[class*="pt-gain"], td.pt-num[class*="pt-loss"]')
    const smPnlCell = pnlCells[0]
    expect(smPnlCell.classes()).toContain('pt-gain')
  })

  it('negative P&L has danger tone (red)', () => {
    const wrapper = createWrapper(POSITIONS_WITH_PNL)
    // ALI has pnl = -200 → cell should have pt-loss class
    const pnlCells = wrapper.findAll('td.pt-num[class*="pt-gain"], td.pt-num[class*="pt-loss"]')
    const aliPnlCell = pnlCells[1]
    expect(aliPnlCell.classes()).toContain('pt-loss')
  })

  // ── Table renders ─────────────────────────────────────────────────────────────

  it('renders a table element', () => {
    const wrapper = createWrapper(POSITIONS_WITH_PNL)
    expect(wrapper.find('.pt-table').exists()).toBe(true)
  })
})
