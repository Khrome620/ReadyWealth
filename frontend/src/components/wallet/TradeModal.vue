<template>
  <SprModal
    :model-value="modelValue"
    :title="`Place ${orderType === 'long' ? 'Long (Buy)' : 'Short (Sell)'} Order`"
    size="md"
    :static-backdrop="true"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <template #default>
      <div class="tm-form">
        <SprSelect
          id="trade-stock-select"
          v-model="selectedTicker"
          :options="stockOptions"
          label="Select Stock"
          placeholder="Search PSE stock..."
          :searchable="true"
          text-field="text"
          value-field="value"
          :error="!!errors.ticker"
          :display-helper="!!errors.ticker"
          :helper-text="errors.ticker ?? ''"
        />

        <SprInputCurrency
          id="trade-amount"
          v-model="amountStr"
          label="Amount (PHP)"
          currency="PHP"
          :auto-format="true"
          @get-currency-value="onCurrencyValue"
        />

        <div v-if="errors.amount" class="tm-error">{{ errors.amount }}</div>

        <div class="tm-balance">
          Available balance: <strong>{{ formatPHP(wallet.balance) }}</strong>
        </div>
      </div>
    </template>

    <template #footer>
      <SprButton
        :tone="orderType === 'long' ? 'success' : 'danger'"
        variant="primary"
        :disabled="submitting"
        @click="handleSubmit"
      >
        {{ submitting ? 'Processing...' : 'Confirm Order' }}
      </SprButton>
      <SprButton tone="neutral" variant="secondary" @click="handleClose">
        Cancel
      </SprButton>
    </template>
  </SprModal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useMarketStore } from '../../stores/market'
import { useWalletStore } from '../../stores/wallet'
import { useSnack } from '../../composables/useSnack'
import type { OrderType } from '../../types'

const props = defineProps<{
  modelValue: boolean
  orderType: OrderType
  prefillTicker?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const market = useMarketStore()
const wallet = useWalletStore()
const { showSuccess, showDanger } = useSnack()

const selectedTicker = ref(props.prefillTicker ?? '')
const amountStr = ref('')
const amountNum = ref(0)
const submitting = ref(false)
const errors = ref<{ ticker?: string; amount?: string }>({})

const stockOptions = computed(() =>
  market.stocks.map(s => ({ text: `${s.ticker} — ${s.name}`, value: s.ticker }))
)

watch(() => props.prefillTicker, val => { if (val) selectedTicker.value = val })

watch(() => props.modelValue, open => {
  if (open) {
    selectedTicker.value = props.prefillTicker ?? ''
    amountStr.value = ''
    amountNum.value = 0
    errors.value = {}
    submitting.value = false
  }
})

function onCurrencyValue(val: number | null) {
  amountNum.value = val ?? 0
}

function validate(): boolean {
  errors.value = {}
  if (!selectedTicker.value) errors.value.ticker = 'Please select a stock.'
  if (amountNum.value <= 0) errors.value.amount = 'Amount must be greater than zero.'
  else if (amountNum.value > wallet.balance) errors.value.amount = 'Insufficient balance.'
  return Object.keys(errors.value).length === 0
}

async function handleSubmit() {
  if (!validate() || submitting.value) return
  submitting.value = true
  try {
    await wallet.submitOrder({ ticker: selectedTicker.value, type: props.orderType, amount: amountNum.value })
    showSuccess(`Order placed: ${props.orderType.toUpperCase()} ${selectedTicker.value} ₱${amountNum.value.toLocaleString()}`)
    emit('update:modelValue', false)
  } catch (e) {
    showDanger(e instanceof Error ? e.message : 'Order failed.')
  } finally {
    setTimeout(() => { submitting.value = false }, 3000)
  }
}

function handleClose() {
  emit('update:modelValue', false)
}

function formatPHP(n: number) {
  return `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
}
</script>

<style scoped>
.tm-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}
.tm-balance {
  font-size: 0.875rem;
  color: #475569;
}
.tm-error {
  font-size: 0.8rem;
  color: #dc2626;
}
</style>
