import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { defineComponent } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { useMarketFeed } from '../../../src/composables/useMarketFeed'
import { useMarketStore } from '../../../src/stores/market'

// Prevent MockMarketService from running real logic in composable tests
vi.mock('../../../src/services/MockMarketService', () => ({
  mockMarketService: {
    getStocks: vi.fn().mockResolvedValue([]),
    isMarketOpen: vi.fn().mockReturnValue(false),
  },
}))

const FIFTEEN_MIN = 15 * 60 * 1000

function mountWithComposable() {
  const pinia = createTestingPinia({ createSpy: vi.fn, stubActions: true })
  const wrapper = mount(
    defineComponent({
      setup() {
        useMarketFeed()
        return () => null
      },
    }),
    { global: { plugins: [pinia] } },
  )
  const market = useMarketStore()
  return { wrapper, market }
}

describe('useMarketFeed', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('calls market.refresh() immediately on mount', async () => {
    const { market } = mountWithComposable()
    await flushPromises()
    expect(market.refresh).toHaveBeenCalledTimes(1)
  })

  it('calls market.refresh() again after 15-minute interval', async () => {
    const { market } = mountWithComposable()
    await flushPromises()
    expect(market.refresh).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(FIFTEEN_MIN)
    await flushPromises()
    expect(market.refresh).toHaveBeenCalledTimes(2)
  })

  it('does not fire before 15 minutes have elapsed', async () => {
    const { market } = mountWithComposable()
    await flushPromises()

    vi.advanceTimersByTime(FIFTEEN_MIN - 1)
    await flushPromises()
    expect(market.refresh).toHaveBeenCalledTimes(1)
  })

  it('fires multiple times for multiple interval ticks', async () => {
    const { market } = mountWithComposable()
    await flushPromises()

    vi.advanceTimersByTime(FIFTEEN_MIN * 3)
    await flushPromises()
    expect(market.refresh).toHaveBeenCalledTimes(4) // 1 on mount + 3 ticks
  })

  it('clears the interval on unmount (no memory leak)', async () => {
    const clearSpy = vi.spyOn(globalThis, 'clearInterval')
    const { wrapper } = mountWithComposable()
    await flushPromises()

    wrapper.unmount()

    expect(clearSpy).toHaveBeenCalled()
  })

  it('does not fire after unmount', async () => {
    const { wrapper, market } = mountWithComposable()
    await flushPromises()

    wrapper.unmount()
    vi.advanceTimersByTime(FIFTEEN_MIN * 2)
    await flushPromises()

    // Only the initial call — no extra calls after unmount
    expect(market.refresh).toHaveBeenCalledTimes(1)
  })
})
