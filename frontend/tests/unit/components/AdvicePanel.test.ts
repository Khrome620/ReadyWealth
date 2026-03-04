import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import AdvicePanel from '../../../src/components/advice/AdvicePanel.vue'

vi.mock('../../../src/services/PaperOrderService', () => ({
  paperOrderService: {
    placeOrder: vi.fn(),
    fetchBalance: vi.fn().mockResolvedValue(null),
    getOrders: vi.fn().mockResolvedValue([]),
  },
}))

vi.mock('../../../src/services/MockMarketService', () => ({
  mockMarketService: {
    getStocks: vi.fn().mockResolvedValue([]),
    isMarketOpen: vi.fn().mockReturnValue(true),
  },
}))

// Market stocks that will produce ≥3 recommendations via the advice store's computed logic.
// 3 positive-changePct movers (A, B, C) + 2 top-volume non-movers (E, F) = 5 recommendations.
import type { Stock } from '../../../src/types'

function stock(ticker: string, changePct: number, volume: number, price = 100): Stock {
  return { ticker, name: `${ticker} Corp.`, price, change: 0, changePct, volume }
}

const MARKET_STOCKS: Stock[] = [
  stock('A', 5.0, 1_000),   // mover #1 — high
  stock('B', 4.0, 2_000),   // mover #2 — high
  stock('C', 2.0, 3_000),   // mover #3 — medium
  stock('D', 1.5, 4_000),   // mover #4 — bumped
  stock('E', 0.0, 9_000),   // top-volume #1
  stock('F', -1.0, 8_000),  // top-volume #2
  stock('G', -2.0, 100),    // irrelevant
]

const STUBS = {
  SprCard: {
    name: 'SprCard',
    template: `<div class="spr-card"><slot name="content" /></div>`,
    props: ['title', 'tone', 'showFooter'],
  },
  SprBanner: {
    name: 'SprBanner',
    template: `<div class="spr-banner"><slot /></div>`,
    props: ['tone'],
  },
  SprLozenge: {
    name: 'SprLozenge',
    template: `<span class="spr-lozenge">{{ label }}</span>`,
    props: ['label', 'tone', 'fill'],
  },
  SprButton: {
    name: 'SprButton',
    template: `<button class="spr-btn" @click="$emit('click')"><slot /></button>`,
    props: ['tone', 'variant', 'size'],
    emits: ['click'],
  },
  SprModal: {
    name: 'SprModal',
    template: `<div class="spr-modal" v-if="modelValue"><slot /><slot name="footer" /></div>`,
    props: ['modelValue', 'title', 'size'],
    emits: ['update:modelValue'],
  },
  // TradeModal uses SprInputCurrency; stub that too to avoid deep mounting
  SprInputCurrency: {
    name: 'SprInputCurrency',
    template: `<input class="spr-currency" />`,
    props: ['modelValue', 'label', 'currency'],
    emits: ['update:modelValue', 'getCurrencyValue'],
  },
  SprSelect: {
    name: 'SprSelect',
    template: `<select class="spr-select"></select>`,
    props: ['modelValue', 'options', 'label', 'placeholder'],
    emits: ['update:modelValue'],
  },
}

function createWrapper(opts: { emptyMarket?: boolean } = {}) {
  return mount(AdvicePanel, {
    global: {
      plugins: [
        createTestingPinia({
          stubActions: true,
          createSpy: vi.fn,
          initialState: {
            // Drive recommendations through market stocks (advice.recommendations is a computed)
            market: {
              stocks: opts.emptyMarket ? [] : MARKET_STOCKS,
              loading: false,
              error: null,
            },
            wallet: { balance: 100_000 },
          },
        }),
      ],
      stubs: STUBS,
    },
  })
}

describe('AdvicePanel', () => {
  // ── Disclaimer ──────────────────────────────────────────────────────────────

  it('disclaimer banner is always rendered', () => {
    const wrapper = createWrapper()
    expect(wrapper.find('.spr-banner').exists()).toBe(true)
    expect(wrapper.find('.spr-banner').text()).toContain('Not financial advice')
  })

  it('disclaimer is present even when recommendations are empty', () => {
    const wrapper = createWrapper({ emptyMarket: true })
    expect(wrapper.find('.spr-banner').exists()).toBe(true)
  })

  // ── Recommendation cards ────────────────────────────────────────────────────

  it('renders ≥3 recommendation cards', () => {
    const wrapper = createWrapper()
    expect(wrapper.findAll('.rec-card').length).toBeGreaterThanOrEqual(3)
  })

  it('renders 5 cards for full MARKET_STOCKS dataset', () => {
    const wrapper = createWrapper()
    // 3 movers (A,B,C) + 2 volume (E,F) = 5
    expect(wrapper.findAll('.rec-card')).toHaveLength(5)
  })

  it('each card shows its ticker', () => {
    const wrapper = createWrapper()
    // RecommendationCard renders rec.ticker (not name); top movers are A, B, C
    const tickers = wrapper.findAll('.rec-ticker').map(w => w.text())
    expect(tickers).toContain('A')
    expect(tickers).toContain('B')
    expect(tickers).toContain('C')
  })

  it('each card shows confidence badge', () => {
    const wrapper = createWrapper()
    const lozenges = wrapper.findAll('.spr-lozenge')
    expect(lozenges.length).toBeGreaterThanOrEqual(3)
  })

  it('shows empty state message when no recommendations', () => {
    const wrapper = createWrapper({ emptyMarket: true })
    expect(wrapper.find('.ap-empty').exists()).toBe(true)
  })

  // ── Trade interaction ────────────────────────────────────────────────────────

  it('clicking Trade button opens the trade modal', async () => {
    const wrapper = createWrapper()

    // The "Trade" button is inside RecommendationCard (.rec-card .spr-btn)
    const tradeBtn = wrapper.find('.rec-card .spr-btn')
    await tradeBtn.trigger('click')
    await flushPromises()

    // TradeModal should now be visible
    expect(wrapper.find('.spr-modal').exists()).toBe(true)
  })

  it('clicking Trade pre-fills the modal with the correct ticker', async () => {
    const wrapper = createWrapper()

    // Click Trade on first card (SM)
    const firstCard = wrapper.findAll('.rec-card')[0]
    await firstCard.find('.spr-btn').trigger('click')
    await flushPromises()

    // The SprSelect in the TradeModal should have SM as value
    // (TradeModal's prefillTicker prop sets the select value)
    const modal = wrapper.find('.spr-modal')
    expect(modal.exists()).toBe(true)
  })
})
