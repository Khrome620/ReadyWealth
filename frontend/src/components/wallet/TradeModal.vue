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
        @click="openConfirm"
      >
        Confirm Order
      </SprButton>
      <SprButton tone="neutral" variant="secondary" @click="handleClose">
        Cancel
      </SprButton>
    </template>
  </SprModal>

  <!-- Confirmation modal -->
  <SprModal
    v-model="showConfirm"
    title="Confirm Order"
    size="sm"
    :static-backdrop="true"
    @update:model-value="showConfirm = $event"
  >
    <template #default>
      <div class="tm-confirm-body">
        <div class="tm-confirm-icon" :class="orderType === 'long' ? 'tci-long' : 'tci-short'">
          <SprIcon :icon="orderType === 'long' ? 'ph:trend-up' : 'ph:trend-down'" />
        </div>
        <p class="tm-confirm-line">
          You are about to place a
          <strong :class="orderType === 'long' ? 'tm-long' : 'tm-short'">
            {{ orderType === 'long' ? 'LONG (BUY)' : 'SHORT (SELL)' }}
          </strong>
          order.
        </p>
        <div class="tm-confirm-details">
          <div class="tm-confirm-row">
            <span>Stock</span>
            <strong>{{ selectedTicker }}</strong>
          </div>
          <div class="tm-confirm-row">
            <span>Amount</span>
            <strong>{{ formatPHP(amountNum) }}</strong>
          </div>
          <div class="tm-confirm-row">
            <span>Balance after</span>
            <strong>{{ formatPHP(wallet.balance - amountNum) }}</strong>
          </div>
        </div>
        <p class="tm-confirm-warning">This action cannot be undone.</p>
      </div>
    </template>
    <template #footer>
      <SprButton
        :tone="orderType === 'long' ? 'success' : 'danger'"
        variant="primary"
        :disabled="submitting"
        @click="handleSubmit"
      >
        {{ submitting ? 'Processing...' : 'Yes, place order' }}
      </SprButton>
      <SprButton tone="neutral" variant="secondary" :disabled="submitting" @click="showConfirm = false">
        Go back
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
const showConfirm = ref(false)
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
    showConfirm.value = false
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

function openConfirm() {
  if (!validate()) return
  showConfirm.value = true
}

function closeAll() {
  showConfirm.value = false
  emit('update:modelValue', false)
}

async function handleSubmit() {
  if (submitting.value) return
  submitting.value = true
  try {
    await wallet.submitOrder({ ticker: selectedTicker.value, type: props.orderType, amount: amountNum.value })
    closeAll()
    showSuccess(`Order placed: ${props.orderType.toUpperCase()} ${selectedTicker.value} ₱${amountNum.value.toLocaleString()}`)
  } catch (e) {
    showDanger(e instanceof Error ? e.message : 'Order failed.')
  } finally {
    submitting.value = false
  }
}

function handleClose() {
  closeAll()
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

/* ── Confirmation modal ── */
.tm-confirm-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  text-align: center;
}

.tm-confirm-icon {
  width: 3rem;
  height: 3rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
}

.tci-long  { background: #dcfce7; color: #16a34a; }
.tci-short { background: #fee2e2; color: #dc2626; }

.tm-confirm-line {
  margin: 0;
  font-size: 0.9rem;
  color: #334155;
}

.tm-long  { color: #16a34a; }
.tm-short { color: #dc2626; }

.tm-confirm-details {
  width: 100%;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 0.75rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.tm-confirm-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.85rem;
  color: #475569;
}

.tm-confirm-row strong {
  color: #0f172a;
}

.tm-confirm-warning {
  margin: 0;
  font-size: 0.75rem;
  color: #94a3b8;
}
</style>
