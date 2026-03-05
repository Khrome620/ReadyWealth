<template>
  <div class="wp-root">
  <SprCard tone="neutral" header-icon="ph:wallet" :show-footer="false">
    <template #header>
      <div class="wp-header">
        <span class="wp-brand">SproutPurse</span>
        <span class="wp-separator">·</span>
        <span class="wp-subtitle">My Wallet</span>
      </div>
    </template>
    <template #content>
      <div class="wp-greeting">Hello, <span class="wp-name">{{ displayName }}</span></div>
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

  <!-- Portfolio list — outside the card so it is never clipped -->
  <div v-if="positions.openPositions.length" class="wp-portfolio">
    <div class="wp-portfolio-header">
      <div class="wp-portfolio-title">Open Positions</div>
      <button class="wp-portfolio-link" @click="router.push('/portfolio')">View all →</button>
    </div>
    <div
      v-for="p in positions.positionsWithCurrentValue"
      :key="p.id"
      class="wp-position-row"
      @click="router.push('/portfolio')"
    >
      <div class="wp-pos-left">
        <span class="wp-pos-ticker">{{ p.ticker }}</span>
        <span class="wp-pos-type" :class="p.type === 'long' ? 'wp-long' : 'wp-short'">
          {{ p.type === 'long' ? 'L' : 'S' }}
        </span>
      </div>
      <div class="wp-pos-right">
        <span class="wp-pos-value">{{ formatPHP(p.currentValue) }}</span>
        <span class="wp-pos-pnl" :class="p.pnl >= 0 ? 'wp-gain' : 'wp-loss'">
          {{ p.pnl >= 0 ? '+' : '' }}{{ formatPHP(p.pnl) }}
          ({{ p.pnlPct >= 0 ? '+' : '' }}{{ p.pnlPct.toFixed(2) }}%)
        </span>
      </div>
    </div>
  </div>

  <TradeModal
    v-model="showModal"
    :order-type="orderType"
    :prefill-ticker="prefillTicker"
  />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import TradeModal from './TradeModal.vue'
import { useWalletStore } from '../../stores/wallet'
import { usePositionsStore } from '../../stores/positions'
import { useAuthStore } from '../../stores/auth'
import type { OrderType } from '../../types'

const router = useRouter()

const props = defineProps<{ prefillTicker?: string }>()

const wallet = useWalletStore()
const positions = usePositionsStore()
const auth = useAuthStore()
const displayName = computed(() => {
  const u = auth.user
  if (!u) return 'there'
  return u.firstName ? `${u.firstName} ${u.lastName}`.trim() : u.username
})
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
.wp-root {
  display: flex;
  flex-direction: column;
  gap: 0;
  height: 100%;
}
.wp-header {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}
.wp-brand {
  font-weight: 700;
  color: #16a34a;
}
.wp-separator {
  color: #94a3b8;
}
.wp-subtitle {
  color: #64748b;
  font-weight: 500;
}
.wp-greeting {
  font-size: 1.05rem;
  color: #64748b;
  margin-bottom: 0.75rem;
}
.wp-name {
  font-weight: 700;
  color: #1e293b;
  font-size: 1.1rem;
}
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

/* ── Portfolio list ── */
.wp-portfolio {
  margin-top: 1.25rem;
  border-top: 1px solid #e2e8f0;
  padding-top: 1rem;
}

.wp-portfolio-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.6rem;
}

.wp-portfolio-title {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #94a3b8;
}

.wp-portfolio-link {
  font-size: 0.7rem;
  font-weight: 600;
  color: #16a34a;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
}

.wp-portfolio-link:hover {
  text-decoration: underline;
}

.wp-position-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.45rem 0.25rem;
  border-bottom: 1px solid #f1f5f9;
  cursor: pointer;
  border-radius: 4px;
  transition: background 0.1s;
}

.wp-position-row:hover {
  background: #f1f5f9;
}

.wp-position-row:last-child {
  border-bottom: none;
}

.wp-pos-left {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.wp-pos-ticker {
  font-weight: 700;
  font-size: 0.82rem;
  color: #1e293b;
  font-family: monospace;
}

.wp-pos-type {
  font-size: 0.6rem;
  font-weight: 800;
  padding: 0.1rem 0.3rem;
  border-radius: 3px;
}

.wp-long  { background: #dcfce7; color: #16a34a; }
.wp-short { background: #fee2e2; color: #dc2626; }

.wp-pos-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.wp-pos-value {
  font-size: 0.82rem;
  font-weight: 600;
  color: #1e293b;
}

.wp-pos-pnl {
  font-size: 0.72rem;
  font-weight: 600;
}

.wp-gain { color: #16a34a; }
.wp-loss { color: #dc2626; }
</style>
