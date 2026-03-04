<template>
  <div>
    <!-- Summary bar -->
    <div v-if="positions.positionsWithCurrentValue.length" class="pt-summary">
      <div class="pt-summary-item">
        <span class="pt-summary-label">Total Invested</span>
        <span class="pt-summary-value">{{ fmt(summary.totalInvested) }}</span>
      </div>
      <div class="pt-summary-divider" />
      <div class="pt-summary-item">
        <span class="pt-summary-label">Current Value</span>
        <span class="pt-summary-value">{{ fmt(summary.totalValue) }}</span>
      </div>
      <div class="pt-summary-divider" />
      <div class="pt-summary-item">
        <span class="pt-summary-label">Total P&amp;L</span>
        <span class="pt-summary-value" :class="summary.totalPnl >= 0 ? 'pt-gain' : 'pt-loss'">
          {{ summary.totalPnl >= 0 ? '+' : '' }}{{ fmt(summary.totalPnl) }}
        </span>
      </div>
      <div class="pt-summary-divider" />
      <div class="pt-summary-item">
        <span class="pt-summary-label">Return</span>
        <span class="pt-summary-badge" :class="summary.totalPnlPct >= 0 ? 'pt-gain-bg' : 'pt-loss-bg'">
          {{ summary.totalPnlPct >= 0 ? '▲' : '▼' }}
          {{ Math.abs(summary.totalPnlPct).toFixed(2) }}%
        </span>
      </div>
    </div>

    <!-- Table -->
    <div class="pt-wrap">
      <!-- Empty state -->
      <div v-if="!positions.positionsWithCurrentValue.length" class="pt-empty">
        <SprIcon icon="ph:chart-pie" class="pt-empty-icon" />
        <p>No open positions</p>
        <span>Start trading from the dashboard.</span>
        <button class="pt-go-btn" @click="$router.push('/')">Go to Dashboard</button>
      </div>

      <table v-else class="pt-table">
        <thead>
          <tr>
            <th>Stock</th>
            <th>Type</th>
            <th class="pt-num">Entry Price</th>
            <th class="pt-num">Current Price</th>
            <th class="pt-num">Invested (PHP)</th>
            <th class="pt-num">Current Value</th>
            <th class="pt-num">Unrealized P&amp;L</th>
            <th class="pt-num">G/L %</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in paged" :key="p.id" class="pt-row">
            <td class="pt-ticker">{{ p.ticker }}</td>
            <td>
              <span class="pt-badge" :class="p.type === 'long' ? 'pt-long' : 'pt-short'">
                {{ p.type === 'long' ? 'LONG' : 'SHORT' }}
              </span>
            </td>
            <td class="pt-num pt-price">{{ fmt(p.entryPrice) }}</td>
            <td class="pt-num pt-price">{{ fmt(p.currentPrice) }}</td>
            <td class="pt-num">{{ fmt(p.investedAmount) }}</td>
            <td class="pt-num pt-bold">{{ fmt(p.currentValue) }}</td>
            <td class="pt-num" :class="p.pnl >= 0 ? 'pt-gain' : 'pt-loss'">
              {{ p.pnl >= 0 ? '+' : '' }}{{ fmt(p.pnl) }}
            </td>
            <td class="pt-num">
              <span class="pt-pct-badge" :class="p.pnlPct >= 0 ? 'pt-gain-bg' : 'pt-loss-bg'">
                {{ p.pnlPct >= 0 ? '▲' : '▼' }} {{ Math.abs(p.pnlPct).toFixed(2) }}%
              </span>
            </td>
            <td>
              <button class="pt-close-btn" @click="openClose(p.id, p.ticker)">Close</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <SprTablePagination
      v-if="positions.positionsWithCurrentValue.length"
      :total-items="positions.positionsWithCurrentValue.length"
      :current-page="page"
      :selected-row-count="pageSize"
      :dropdown-selection="pageSizeOptions"
      :bordered="false"
      @update:current-page="page = $event"
      @update:selected-row-count="onPageSizeChange"
      @previous="page = Math.max(1, page - 1)"
      @next="page = Math.min(totalPages, page + 1)"
    />
  </div>

  <ClosePositionModal
    v-model="showCloseModal"
    :position-id="closeTarget?.id ?? ''"
    :ticker="closeTarget?.ticker ?? ''"
  />
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import ClosePositionModal from './ClosePositionModal.vue'
import { usePositionsStore } from '../../stores/positions'

const positions = usePositionsStore()

const page = ref(1)
const pageSize = ref(10)
const pageSizeOptions = [
  { text: '10', value: '10' },
  { text: '20', value: '20' },
  { text: '50', value: '50' },
]

const totalPages = computed(() => Math.ceil(positions.positionsWithCurrentValue.length / pageSize.value) || 1)
const paged = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return positions.positionsWithCurrentValue.slice(start, start + pageSize.value)
})

function onPageSizeChange(val: number) {
  pageSize.value = val
  page.value = 1
}

const summary = computed(() => {
  const all = positions.positionsWithCurrentValue
  const totalInvested = all.reduce((s, p) => s + p.investedAmount, 0)
  const totalValue    = all.reduce((s, p) => s + p.currentValue, 0)
  const totalPnl      = all.reduce((s, p) => s + p.pnl, 0)
  const totalPnlPct   = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0
  return { totalInvested, totalValue, totalPnl, totalPnlPct }
})

function fmt(n: number) {
  return `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
}

const showCloseModal = ref(false)
const closeTarget = ref<{ id: string; ticker: string } | null>(null)

function openClose(id: string, ticker: string) {
  closeTarget.value = { id, ticker }
  showCloseModal.value = true
}
</script>

<style scoped>
/* ── Summary bar ── */
.pt-summary {
  display: flex;
  align-items: center;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 0.75rem 1.5rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.pt-summary-item {
  display: flex;
  flex-direction: column;
  padding: 0 1.25rem;
  flex: 1;
  min-width: 120px;
}

.pt-summary-item:first-child { padding-left: 0; }

.pt-summary-label {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #94a3b8;
  font-weight: 600;
  margin-bottom: 0.2rem;
}

.pt-summary-value {
  font-size: 1rem;
  font-weight: 700;
  color: #1e293b;
}

.pt-summary-divider {
  width: 1px;
  height: 36px;
  background: #e2e8f0;
  flex-shrink: 0;
}

.pt-summary-badge {
  display: inline-block;
  font-size: 0.85rem;
  font-weight: 700;
  padding: 0.15rem 0.5rem;
  border-radius: 6px;
}

/* ── Table wrap ── */
.pt-wrap {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  overflow: hidden;
}

.pt-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.83rem;
}

thead tr { background: #f8fafc; }

th {
  padding: 0.65rem 1rem;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #94a3b8;
  text-align: left;
  border-bottom: 1px solid #e2e8f0;
  white-space: nowrap;
}

th.pt-num { text-align: right; }

.pt-row {
  border-bottom: 1px solid #f1f5f9;
  transition: background 0.1s;
}

.pt-row:last-child { border-bottom: none; }
.pt-row:hover { background: #f8fafc; }

td {
  padding: 0.65rem 1rem;
  color: #334155;
  white-space: nowrap;
}

td.pt-num { text-align: right; }

.pt-ticker {
  font-weight: 700;
  color: #0f172a;
  font-family: monospace;
}

.pt-price { color: #64748b; }
.pt-bold  { font-weight: 700; color: #0f172a; }

/* ── Badges ── */
.pt-badge {
  display: inline-block;
  font-size: 0.65rem;
  font-weight: 800;
  padding: 0.15rem 0.45rem;
  border-radius: 4px;
  letter-spacing: 0.05em;
}

.pt-long  { background: #dcfce7; color: #15803d; }
.pt-short { background: #fee2e2; color: #b91c1c; }

.pt-pct-badge {
  display: inline-block;
  font-size: 0.72rem;
  font-weight: 700;
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
}

/* ── Colours ── */
.pt-gain    { color: #15803d; font-weight: 600; }
.pt-loss    { color: #b91c1c; font-weight: 600; }
.pt-gain-bg { background: #dcfce7; color: #15803d; }
.pt-loss-bg { background: #fee2e2; color: #b91c1c; }

/* ── Close button ── */
.pt-close-btn {
  background: none;
  border: 1px solid #fca5a5;
  color: #b91c1c;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.25rem 0.65rem;
  border-radius: 5px;
  cursor: pointer;
  transition: background 0.15s;
}

.pt-close-btn:hover {
  background: #fee2e2;
}

/* ── Empty state ── */
.pt-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1rem;
  color: #94a3b8;
  gap: 0.4rem;
}

.pt-empty-icon { font-size: 2.5rem; margin-bottom: 0.5rem; }

.pt-empty p {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: #475569;
}

.pt-empty span { font-size: 0.82rem; }

.pt-go-btn {
  margin-top: 0.75rem;
  background: #0f172a;
  color: #fff;
  border: none;
  padding: 0.5rem 1.25rem;
  border-radius: 6px;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
}
</style>
