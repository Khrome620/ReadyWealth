<template>
  <div class="wp-root">
  <SprCard tone="neutral" header-icon="ph:wallet" :show-footer="false">
    <template #header>
      <div class="wp-header">
        <span class="wp-brand">ReadyPurse</span>
        <span class="wp-separator">·</span>
        <span class="wp-subtitle">My Wallet</span>
      </div>
    </template>
    <template #content>
      <div class="wp-greeting">Hello, <span class="wp-name">{{ displayName }}</span></div>
      <div class="wp-balance-label">Available Balance</div>
      <div class="wp-balance-row">
        <div class="wp-balance">{{ formatPHP(wallet.balance) }}</div>
        <button class="wp-add-btn" title="Add funds" @click="toggleAddFunds">+</button>
      </div>

      <!-- Add funds panel -->
      <div v-if="showAddFunds" class="wp-add-panel">
        <div class="wp-add-presets">
          <button v-for="amt in presets" :key="amt" class="wp-preset" @click="addAmount(amt)">
            +{{ formatShort(amt) }}
          </button>
        </div>
        <div class="wp-add-custom">
          <input
            ref="customInput"
            v-model.number="customAmount"
            class="wp-add-input"
            type="number"
            min="1"
            placeholder="Custom amount"
            @keyup.enter="confirmCustom"
          />
          <button class="wp-add-confirm" :disabled="!customAmount || customAmount <= 0" @click="confirmCustom">Add</button>
        </div>
      </div>

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
  <div class="wp-portfolio">
    <div class="wp-portfolio-header">
      <div class="wp-portfolio-title">Open Positions</div>
      <button v-if="positions.openPositions.length" class="wp-portfolio-link" @click="router.push('/portfolio')">View all →</button>
    </div>
    <div v-if="!positions.openPositions.length" class="wp-no-positions">
      No open positions yet.
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
import { ref, computed, nextTick } from 'vue'
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

// ── Add funds ────────────────────────────────────────────────────────────────
const showAddFunds = ref(false)
const customAmount = ref<number | null>(null)
const customInput = ref<HTMLInputElement | null>(null)
const presets = [100_000, 250_000, 500_000]

function toggleAddFunds() {
  showAddFunds.value = !showAddFunds.value
  if (showAddFunds.value) {
    customAmount.value = null
    nextTick(() => customInput.value?.focus())
  }
}

async function addAmount(amount: number) {
  await wallet.deposit(amount)
  showAddFunds.value = false
}

async function confirmCustom() {
  if (!customAmount.value || customAmount.value <= 0) return
  await wallet.deposit(customAmount.value)
  showAddFunds.value = false
  customAmount.value = null
}

// ── Formatting ───────────────────────────────────────────────────────────────
function formatPHP(n: number) {
  return `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
}

function formatShort(n: number) {
  if (n >= 1_000_000) return `${n / 1_000_000}M`
  if (n >= 1_000) return `${n / 1_000}K`
  return String(n)
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

/* ── Balance row with + button ── */
.wp-balance-row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin-bottom: 1.5rem;
}

.wp-balance {
  font-size: 1.75rem;
  font-weight: 700;
  color: #1e293b;
}

.wp-add-btn {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  border: 1.5px solid #16a34a;
  background: none;
  color: #16a34a;
  font-size: 1.1rem;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: background 0.15s, color 0.15s;
  padding: 0;
}

.wp-add-btn:hover {
  background: #16a34a;
  color: #fff;
}

/* ── Add funds panel ── */
.wp-add-panel {
  margin-top: -1rem;
  margin-bottom: 1.25rem;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 0.85rem;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.wp-add-presets {
  display: flex;
  gap: 0.4rem;
}

.wp-preset {
  flex: 1;
  padding: 0.35rem 0.4rem;
  border-radius: 6px;
  border: 1px solid #d1fae5;
  background: #f0fdf4;
  color: #16a34a;
  font-size: 0.75rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}

.wp-preset:hover {
  background: #dcfce7;
  border-color: #16a34a;
}

.wp-add-custom {
  display: flex;
  gap: 0.4rem;
}

.wp-add-input {
  flex: 1;
  padding: 0.4rem 0.6rem;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 0.82rem;
  color: #1e293b;
  background: #fff;
  outline: none;
  min-width: 0;
}

.wp-add-input:focus {
  border-color: #16a34a;
}

.wp-add-confirm {
  padding: 0.4rem 0.85rem;
  border-radius: 6px;
  border: none;
  background: #16a34a;
  color: #fff;
  font-size: 0.78rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s;
  flex-shrink: 0;
}

.wp-add-confirm:hover:not(:disabled) {
  background: #15803d;
}

.wp-add-confirm:disabled {
  opacity: 0.4;
  cursor: not-allowed;
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

.wp-no-positions {
  font-size: 0.78rem;
  color: #94a3b8;
  padding: 0.5rem 0.25rem;
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
