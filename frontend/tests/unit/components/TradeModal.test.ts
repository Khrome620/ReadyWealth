import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { createTestingPinia } from '@pinia/testing'
import { useWalletStore } from '../../../src/stores/wallet'
import TradeModal from '../../../src/components/wallet/TradeModal.vue'
import type { Stock } from '../../../src/types'

vi.mock('../../../src/services/PaperOrderService', () => ({
  paperOrderService: {
    placeOrder: vi.fn().mockResolvedValue({
      transaction: {
        id: 'tx-001', ticker: 'SM', type: 'long', amount: 5000,
        date: '2026-03-03T01:00:00Z', status: 'open',
      },
      walletBalance: null,
    }),
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

vi.mock('../../../src/composables/useSnack', () => ({
  useSnack: () => ({
    showSuccess: vi.fn(),
    showDanger: vi.fn(),
    showInfo: vi.fn(),
  }),
}))

const STOCKS: Stock[] = [
  { ticker: 'SM',  name: 'SM Investments', price: 912, change: 12,   changePct: 1.33,  volume: 1_000_000 },
  { ticker: 'ALI', name: 'Ayala Land',     price: 28,  change: -0.4, changePct: -1.38, volume: 3_000_000 },
]

// Named stubs so findComponent({ name }) resolves correctly
const STUBS = {
  SprModal: {
    name: 'SprModal',
    template: `<div class="spr-modal" v-if="modelValue">
      <div class="modal-title">{{ title }}</div>
      <slot />
      <slot name="footer" />
    </div>`,
    props: ['modelValue', 'title', 'size', 'staticBackdrop'],
    emits: ['update:modelValue'],
  },
  SprSelect: {
    name: 'SprSelect',
    template: `<select class="spr-select" :value="modelValue"
      @change="$emit('update:modelValue', $event.target.value)">
      <option v-for="o in options" :key="o.value" :value="o.value">{{ o.text }}</option>
    </select>`,
    props: ['modelValue', 'options', 'label', 'placeholder', 'searchable',
            'textField', 'valueField', 'error', 'displayHelper', 'helperText'],
    emits: ['update:modelValue'],
  },
  SprInputCurrency: {
    name: 'SprInputCurrency',
    template: '<input class="spr-currency" type="number" />',
    props: ['modelValue', 'label', 'currency', 'autoFormat'],
    emits: ['update:modelValue', 'getCurrencyValue'],
  },
  SprButton: {
    name: 'SprButton',
    template: '<button class="spr-btn" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
    props: ['tone', 'variant', 'disabled'],
    emits: ['click'],
  },
}

function createWrapper(props: Record<string, unknown> = {}) {
  return mount(TradeModal, {
    props: { modelValue: true, orderType: 'long', ...props },
    global: {
      plugins: [
        createTestingPinia({
          stubActions: true,
          createSpy: vi.fn,
          initialState: {
            market: { stocks: STOCKS, loading: false, error: null },
            wallet: { balance: 50_000 },
          },
        }),
      ],
      stubs: STUBS,
    },
  })
}

describe('TradeModal', () => {
  it('renders when modelValue is true', () => {
    const wrapper = createWrapper()
    expect(wrapper.find('.spr-modal').exists()).toBe(true)
  })

  it('does not render when modelValue is false', () => {
    const wrapper = createWrapper({ modelValue: false })
    expect(wrapper.find('.spr-modal').exists()).toBe(false)
  })

  it('shows "Long (Buy)" in title for long orders', () => {
    const wrapper = createWrapper({ orderType: 'long' })
    expect(wrapper.find('.modal-title').text()).toContain('Long (Buy)')
  })

  it('shows "Short (Sell)" in title for short orders', () => {
    const wrapper = createWrapper({ orderType: 'short' })
    expect(wrapper.find('.modal-title').text()).toContain('Short (Sell)')
  })

  it('stock select is populated with market stocks', () => {
    const wrapper = createWrapper()
    const options = wrapper.findAll('.spr-select option')
    expect(options).toHaveLength(STOCKS.length)
    expect(options[0].text()).toContain('SM')
    expect(options[1].text()).toContain('ALI')
  })

  it('prefillTicker is pre-selected in the stock dropdown', () => {
    const wrapper = createWrapper({ prefillTicker: 'ALI' })
    expect((wrapper.find('.spr-select').element as HTMLSelectElement).value).toBe('ALI')
  })

  it('shows "Insufficient balance" error when amount exceeds wallet balance', async () => {
    const wrapper = createWrapper({ prefillTicker: 'SM' })

    // Set an amount that exceeds balance (50,000) via the SprInputCurrency emit
    const currencyComp = wrapper.findComponent({ name: 'SprInputCurrency' })
    await currencyComp.vm.$emit('getCurrencyValue', 80_000)
    await flushPromises()

    // Click submit to trigger validation
    const submitBtn = wrapper.findAll('.spr-btn')[0]
    await submitBtn.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Insufficient')
  })

  it('emits update:modelValue=false when Cancel is clicked', async () => {
    const wrapper = createWrapper()
    const cancelBtn = wrapper.findAll('.spr-btn')[1]
    await cancelBtn.trigger('click')
    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')![0]).toEqual([false])
  })

  it('Confirm button is disabled while an order is in-flight', async () => {
    const wrapper = createWrapper({ prefillTicker: 'SM' })
    const wallet = useWalletStore()
    // Make submitOrder hang indefinitely so we can inspect the submitting state
    wallet.submitOrder = vi.fn().mockReturnValue(new Promise(() => {}))

    const currencyComp = wrapper.findComponent({ name: 'SprInputCurrency' })
    await currencyComp.vm.$emit('getCurrencyValue', 5_000)
    await flushPromises()

    // Step 1: click "Confirm Order" to open the confirmation modal
    const confirmOrderBtn = wrapper.findAll('.spr-btn')[0]
    await confirmOrderBtn.trigger('click')
    await flushPromises()

    // Step 2: click "Yes, place order" in the confirmation modal
    const allBtns = wrapper.findAll('.spr-btn')
    const placeOrderBtn = allBtns[allBtns.length - 2] // second-to-last: "Yes, place order"
    await placeOrderBtn.trigger('click')
    await flushPromises()

    expect((placeOrderBtn.element as HTMLButtonElement).disabled).toBe(true)
  })

  it('rapid double-click does not call submitOrder twice', async () => {
    const wrapper = createWrapper({ prefillTicker: 'SM' })
    const wallet = useWalletStore()
    wallet.submitOrder = vi.fn().mockResolvedValue({
      id: 'tx-001', ticker: 'SM', type: 'long', amount: 5000,
      date: '2026-03-03T01:00:00Z', status: 'open',
    })

    const currencyComp = wrapper.findComponent({ name: 'SprInputCurrency' })
    await currencyComp.vm.$emit('getCurrencyValue', 5_000)
    await flushPromises()

    // Step 1: open confirmation modal
    const confirmOrderBtn = wrapper.findAll('.spr-btn')[0]
    await confirmOrderBtn.trigger('click')
    await flushPromises()

    // Step 2: click "Yes, place order" twice rapidly
    const allBtns = wrapper.findAll('.spr-btn')
    const placeOrderBtn = allBtns[allBtns.length - 2] // "Yes, place order"
    await placeOrderBtn.trigger('click')
    await placeOrderBtn.trigger('click') // second rapid click
    await flushPromises()

    expect(wallet.submitOrder).toHaveBeenCalledTimes(1)
  })

  it('displays the available balance from wallet store', () => {
    const wrapper = createWrapper()
    expect(wrapper.text()).toContain('50,000')
  })
})
