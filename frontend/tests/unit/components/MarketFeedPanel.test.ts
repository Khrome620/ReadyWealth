import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { useMarketStore } from '../../../src/stores/market'
import MarketFeedPanel from '../../../src/components/market/MarketFeedPanel.vue'
import type { Stock } from '../../../src/types'

vi.mock('../../../src/services/MockMarketService', () => ({
  mockMarketService: {
    getStocks: vi.fn().mockResolvedValue([]),
    isMarketOpen: vi.fn().mockReturnValue(true),
  },
}))

import { mockMarketService } from '../../../src/services/MockMarketService'

const SAMPLE_STOCKS: Stock[] = [
  { ticker: 'SM',  name: 'SM Corp',    price: 912, change: 12,   changePct: 1.33,  volume: 1_000_000 },
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
        MarketFeedTable: {
          template: '<div class="market-feed-table" :data-ticker-count="stocks ? stocks.length : 0" />',
          props: ['stocks', 'loading', 'marketOpen'],
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

  it('shows "Live" label when market is open', () => {
    vi.mocked(mockMarketService.isMarketOpen).mockReturnValue(true)
    const wrapper = createWrapper({ marketOpen: true })
    expect(wrapper.find('.mfp-status-pill').text()).toContain('Live')
  })

  it('shows "Closed" label when market is closed', () => {
    vi.mocked(mockMarketService.isMarketOpen).mockReturnValue(false)
    const wrapper = createWrapper({ marketOpen: false })
    expect(wrapper.find('.mfp-status-pill').text()).toContain('Closed')
  })

  it('status pill has mfp-open class when market is open', () => {
    vi.mocked(mockMarketService.isMarketOpen).mockReturnValue(true)
    const wrapper = createWrapper({ marketOpen: true })
    expect(wrapper.find('.mfp-status-pill').classes()).toContain('mfp-open')
  })

  it('status pill has mfp-closed class when market is closed', () => {
    vi.mocked(mockMarketService.isMarketOpen).mockReturnValue(false)
    const wrapper = createWrapper({ marketOpen: false })
    expect(wrapper.find('.mfp-status-pill').classes()).toContain('mfp-closed')
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

  it('shows last-updated indicator in header when lastUpdated is available', () => {
    const ts = new Date('2026-03-03T09:30:00')
    const wrapper = createWrapper({ error: 'timeout', lastUpdated: ts })
    // lastUpdated timestamp appears in header as "↻ Xs ago" via .mfp-updated
    expect(wrapper.find('.mfp-updated').exists()).toBe(true)
  })

  it('renders 4 tabs', () => {
    const wrapper = createWrapper()
    expect(wrapper.findAll('.mfp-tab')).toHaveLength(4)
  })

  it('defaults to "Top Gainers" as the active tab', () => {
    const wrapper = createWrapper()
    const activeTab = wrapper.find('.mfp-tab.mfp-tab-active')
    expect(activeTab.text()).toBe('Top Gainers')
  })

  it('switches active tab when a tab button is clicked', async () => {
    const wrapper = createWrapper()
    const tabButtons = wrapper.findAll('.mfp-tab')

    await tabButtons[1].trigger('click') // Top Losers

    const activeTab = wrapper.find('.mfp-tab.mfp-tab-active')
    expect(activeTab.text()).toBe('Top Losers')
  })

  it('passes topGainers stocks to MarketFeedTable on Gainers tab', async () => {
    const wrapper = createWrapper({ stocks: SAMPLE_STOCKS })
    const market = useMarketStore()
    const table = wrapper.find('.market-feed-table')
    expect(Number(table.attributes('data-ticker-count'))).toBe(market.topGainers.length)
  })

  it('passes topLosers stocks to MarketFeedTable on Losers tab', async () => {
    const wrapper = createWrapper({ stocks: SAMPLE_STOCKS })
    const market = useMarketStore()

    const tabButtons = wrapper.findAll('.mfp-tab')
    await tabButtons[1].trigger('click') // Top Losers

    const table = wrapper.find('.market-feed-table')
    expect(Number(table.attributes('data-ticker-count'))).toBe(market.topLosers.length)
  })
})
