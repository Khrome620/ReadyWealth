<template>
  <SprCard title="My Wallet" tone="neutral" :show-footer="false">
    <template #content>
      <div class="wp-balance-label">Available Balance</div>
      <div class="wp-balance">{{ formatPHP(wallet.balance) }}</div>
      <div class="wp-actions">
        <SprButton tone="success" variant="primary" :fullwidth="true" @click="openModal('long')">
          Long (Buy)
        </SprButton>
        <SprButton tone="danger" variant="primary" :fullwidth="true" @click="openModal('short')">
          Short (Sell)
        </SprButton>
      </div>
    </template>
  </SprCard>

  <TradeModal
    v-model="showModal"
    :order-type="orderType"
    :prefill-ticker="prefillTicker"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import TradeModal from './TradeModal.vue'
import { useWalletStore } from '../../stores/wallet'
import type { OrderType } from '../../types'

const props = defineProps<{ prefillTicker?: string }>()

const wallet = useWalletStore()
const showModal = ref(false)
const orderType = ref<OrderType>('long')
const prefillTicker = ref(props.prefillTicker ?? '')

function openModal(type: OrderType) {
  orderType.value = type
  showModal.value = true
}

function formatPHP(n: number) {
  return `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
}
</script>

<style scoped>
.wp-balance-label {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #64748b;
  margin-bottom: 0.25rem;
}
.wp-balance {
  font-size: 1.75rem;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 1.5rem;
}
.wp-actions {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
</style>
