import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { useMarketStore } from '../../../src/stores/market'
import MarketFeedPanel from '../../../src/components/market/MarketFeedPanel.vue'
import type { Stock } from '../../../src/types'

// Control marketOpen via service mock (it's a computed, not a ref)
vi.mock('../../../src/services/MockMarketService', () => ({
  mockMarketService: {
    getStocks: vi.fn().mockResolvedValue([]),
    isMarketOpen: vi.fn().mockReturnValue(true),
  },
}))

import { mockMarketService } from '../../../src/services/MockMarketService'

const SAMPLE_STOCKS: Stock[] = [
  { ticker: 'SM',  name: 'SM Corp',    price: 912, change: 12,  changePct: 1.33,  volume: 1_000_000 },
  { ticker: 'ALI', name: 'Ayala Land', price: 28,  change: -0.4, changePct: -1.38, volume: 3_000_000 },
]

function createWrapper(storeOverrides: Record<string, unknown> = {}) {
  return mount(MarketFeedPanel, {
    global: {
      plugins: [
        createTestingPinia({
          stubActions: true,
          initialState: {
            market: {
              stocks: [],
              loading: false,
              error: null,
              lastUpdated: null,
              ...storeOverrides,
            },
          },
        }),
      ],
      stubs: {
        // Override global stubs to render named slots and allow tab interaction
        SprCard: {
          template: '<div class="spr-card"><slot name="header" /><slot name="content" /></div>',
          props: ['title', 'tone', 'showFooter'],
        },
        SprBanner: {
          template: '<div class="spr-banner"><slot /></div>',
        },
        SprStatus: {
          template: '<span class="spr-status" :data-state="state" />',
          props: ['state', 'size'],
        },
        SprTabs: {
          template: `
            <div class="spr-tabs">
              <button
                v-for="(tab, i) in list"
                :key="i"
                :data-tab="tab"
                :class="{ active: tab === activeTab }"
                @click="$emit('tab-index', i)"
              >{{ tab }}</button>
            </div>`,
          props: ['list', 'activeTab', 'underlined'],
          emits: ['tab-index'],
        },
        MarketFeedTable: {
          template: '<div class="market-feed-table" :data-ticker-count="stocks.length" />',
          props: ['stocks', 'loading'],
        },
      },
    },
  })
}

describe('MarketFeedPanel', () => {
  beforeEach(() => {
    vi.mocked(mockMarketService.isMarketOpen).mockReturnValue(true)
  })

  it('always shows the "Prices delayed" notice', () => {
    const wrapper = createWrapper()
    expect(wrapper.text()).toContain('delayed')
  })

  it('shows "Market Open" label when marketOpen is true', () => {
    vi.mocked(mockMarketService.isMarketOpen).mockReturnValue(true)
    const wrapper = createWrapper()
    expect(wrapper.find('.mfp-status-label').text()).toBe('Market Open')
  })

  it('shows "Market Closed" label when marketOpen is false', () => {
    vi.mocked(mockMarketService.isMarketOpen).mockReturnValue(false)
    const wrapper = createWrapper()
    expect(wrapper.find('.mfp-status-label').text()).toBe('Market Closed')
  })

  it('SprStatus receives success state when market is open', () => {
    vi.mocked(mockMarketService.isMarketOpen).mockReturnValue(true)
    const wrapper = createWrapper()
    expect(wrapper.find('.spr-status').attributes('data-state')).toBe('success')
  })

  it('SprStatus receives danger state when market is closed', () => {
    vi.mocked(mockMarketService.isMarketOpen).mockReturnValue(false)
    const wrapper = createWrapper()
    expect(wrapper.find('.spr-status').attributes('data-state')).toBe('danger')
  })

  it('shows error message when store has error', () => {
    const wrapper = createWrapper({ error: 'Connection refused' })
    expect(wrapper.find('.mfp-error').exists()).toBe(true)
    expect(wrapper.find('.mfp-error').text()).toContain('Failed to load')
  })

  it('does not show error block when store has no error', () => {
    const wrapper = createWrapper({ error: null })
    expect(wrapper.find('.mfp-error').exists()).toBe(false)
  })

  it('shows lastUpdated timestamp in error block when available', () => {
    const ts = new Date('2026-03-03T09:30:00')
    const wrapper = createWrapper({ error: 'timeout', lastUpdated: ts })
    expect(wrapper.find('.mfp-error').text()).toContain('Last updated')
  })

  it('renders 4 tabs', () => {
    const wrapper = createWrapper()
    const tabs = wrapper.findAll('.spr-tabs button')
    expect(tabs).toHaveLength(4)
  })

  it('defaults to "Top Gainers" as the active tab', () => {
    const wrapper = createWrapper()
    const activeButton = wrapper.find('.spr-tabs button.active')
    expect(activeButton.text()).toBe('Top Gainers')
  })

  it('switches active tab when SprTabs emits tab-index', async () => {
    const wrapper = createWrapper()
    const tabButtons = wrapper.findAll('.spr-tabs button')

    await tabButtons[1].trigger('click') // Top Losers

    const activeButton = wrapper.find('.spr-tabs button.active')
    expect(activeButton.text()).toBe('Top Losers')
  })

  it('passes topGainers stocks to MarketFeedTable on Gainers tab', async () => {
    const wrapper = createWrapper({ stocks: SAMPLE_STOCKS })
    const market = useMarketStore()
    // Gainers tab is default — market.topGainers should only include positive stocks
    const table = wrapper.find('.market-feed-table')
    // SM (changePct=1.33) is a gainer, ALI (-1.38) is not
    expect(Number(table.attributes('data-ticker-count'))).toBe(market.topGainers.length)
  })

  it('passes topLosers stocks to MarketFeedTable on Losers tab', async () => {
    const wrapper = createWrapper({ stocks: SAMPLE_STOCKS })
    const market = useMarketStore()

    const tabButtons = wrapper.findAll('.spr-tabs button')
    await tabButtons[1].trigger('click') // Top Losers

    const table = wrapper.find('.market-feed-table')
    expect(Number(table.attributes('data-ticker-count'))).toBe(market.topLosers.length)
  })
})
