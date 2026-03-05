<template>
  <div class="mft-wrap">
    <!-- Closed banner -->
    <div v-if="!marketOpen" class="mft-closed-bar">
      <span class="mft-closed-dot"></span>
      Market closed &mdash; prices as of yesterday's close
    </div>

    <!-- Loading skeleton -->
    <div v-if="loading" class="mft-loading">
      <div v-for="i in PAGE_SIZE" :key="i" class="mft-skeleton-row">
        <div class="mft-sk mft-sk-sm"></div>
        <div class="mft-sk mft-sk-lg"></div>
        <div class="mft-sk mft-sk-md"></div>
        <div class="mft-sk mft-sk-sm"></div>
        <div class="mft-sk mft-sk-sm"></div>
        <div class="mft-sk mft-sk-md"></div>
      </div>
    </div>

    <!-- Empty state -->
    <div v-else-if="!stocks.length" class="mft-empty">
      No data available
    </div>

    <!-- Table -->
    <div v-else class="mft-table-scroll">
    <table class="mft-table">
      <thead>
        <tr>
          <th>Ticker</th>
          <th>Stock</th>
          <th class="mft-num">Price (PHP)</th>
          <th class="mft-num">Change</th>
          <th class="mft-num">Change %</th>
          <th class="mft-num">Volume</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="s in pagedStocks" :key="s.ticker" class="mft-row">
          <td class="mft-ticker">{{ s.ticker }}</td>
          <td class="mft-name">{{ s.name }}</td>
          <td class="mft-num mft-price">₱{{ s.price.toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}</td>
          <td class="mft-num" :class="changeClass(s.change)">
            {{ s.change >= 0 ? '+' : '' }}{{ s.change.toFixed(2) }}
          </td>
          <td class="mft-num" :class="changeClass(s.changePct)">
            <span class="mft-pct-badge" :class="changeClass(s.changePct)">
              {{ s.changePct >= 0 ? '▲' : '▼' }}
              {{ Math.abs(s.changePct).toFixed(2) }}%
            </span>
          </td>
          <td class="mft-num mft-volume">{{ s.volume.toLocaleString() }}</td>
        </tr>
      </tbody>
    </table>

    </div><!-- /mft-table-scroll -->

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="mft-pagination">
      <button class="mft-pg-btn" :disabled="page === 1" @click="page--">‹</button>
      <button
        v-for="p in totalPages"
        :key="p"
        class="mft-pg-btn"
        :class="{ 'mft-pg-active': p === page }"
        @click="page = p"
      >{{ p }}</button>
      <button class="mft-pg-btn" :disabled="page === totalPages" @click="page++">›</button>
      <span class="mft-pg-info">{{ (page - 1) * PAGE_SIZE + 1 }}–{{ Math.min(page * PAGE_SIZE, stocks.length) }} of {{ stocks.length }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { Stock } from '../../types'

const props = defineProps<{
  stocks: Stock[]
  loading?: boolean
  marketOpen?: boolean
}>()

const PAGE_SIZE = 10
const page = ref(1)

// Reset to page 1 when stocks list changes (tab switch)
watch(() => props.stocks, () => { page.value = 1 })

const totalPages = computed(() => Math.ceil(props.stocks.length / PAGE_SIZE))
const pagedStocks = computed(() =>
  props.stocks.slice((page.value - 1) * PAGE_SIZE, page.value * PAGE_SIZE)
)

function changeClass(val: number): string {
  if (val > 0) return 'mft-up'
  if (val < 0) return 'mft-down'
  return 'mft-flat'
}
</script>

<style scoped>
.mft-wrap {
  overflow: hidden;
  display: flex;
  flex-direction: column;
  height: 100%;
}

/* ── Closed bar ── */
.mft-closed-bar {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.7rem;
  color: #94a3b8;
  background: #1a2235;
  padding: 0.35rem 1.25rem;
  border-bottom: 1px solid #1e293b;
  flex-shrink: 0;
}

.mft-closed-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #f87171;
  flex-shrink: 0;
}

/* ── Table scroll wrapper ── */
.mft-table-scroll {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

/* ── Table ── */
.mft-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.78rem;
}

thead tr {
  background: #0a1120;
}

th {
  padding: 0.55rem 1rem;
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #475569;
  text-align: left;
  border-bottom: 1px solid #1e293b;
  white-space: nowrap;
  position: sticky;
  top: 0;
  background: #0a1120;
  z-index: 1;
}

th.mft-num {
  text-align: right;
}

.mft-row {
  border-bottom: 1px solid #1a2235;
  transition: background 0.1s;
}

.mft-row:last-child {
  border-bottom: none;
}

.mft-row:hover {
  background: #1a2235;
}

td {
  padding: 0.55rem 1rem;
  color: #cbd5e1;
  white-space: nowrap;
}

.mft-num {
  text-align: right;
}

.mft-ticker {
  font-weight: 700;
  color: #38bdf8;
  font-family: monospace;
  font-size: 0.82rem;
}

.mft-name {
  color: #94a3b8;
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mft-price {
  font-weight: 600;
  color: #f1f5f9;
  font-variant-numeric: tabular-nums;
}

.mft-volume {
  color: #64748b;
  font-variant-numeric: tabular-nums;
}

/* ── Change colours ── */
.mft-up   { color: #4ade80; }
.mft-down { color: #f87171; }
.mft-flat { color: #94a3b8; }

.mft-pct-badge {
  display: inline-block;
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
  font-size: 0.72rem;
  font-weight: 700;
}

.mft-pct-badge.mft-up   { background: rgba(74, 222, 128, 0.1); }
.mft-pct-badge.mft-down { background: rgba(248, 113, 113, 0.1); }
.mft-pct-badge.mft-flat { background: rgba(148, 163, 184, 0.1); }

/* ── Pagination ── */
.mft-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  padding: 0.6rem 1rem;
  border-top: 1px solid #1e293b;
  background: #0a1120;
  flex-shrink: 0;
}

.mft-pg-btn {
  min-width: 28px;
  height: 28px;
  padding: 0 0.4rem;
  border-radius: 6px;
  border: 1px solid #1e293b;
  background: transparent;
  color: #94a3b8;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.1s, color 0.1s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.mft-pg-btn:hover:not(:disabled) {
  background: #1e293b;
  color: #f1f5f9;
}

.mft-pg-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.mft-pg-active {
  background: #0ea5e9 !important;
  border-color: #0ea5e9 !important;
  color: #fff !important;
}

.mft-pg-info {
  margin-left: 0.5rem;
  font-size: 0.7rem;
  color: #475569;
}

/* ── Loading skeleton ── */
.mft-loading {
  padding: 0.5rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.mft-skeleton-row {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.mft-sk {
  height: 12px;
  border-radius: 4px;
  background: linear-gradient(90deg, #1e293b 25%, #263348 50%, #1e293b 75%);
  background-size: 200% 100%;
  animation: mft-shimmer 1.4s infinite;
}

.mft-sk-sm { width: 48px; }
.mft-sk-md { width: 80px; }
.mft-sk-lg { width: 140px; flex: 1; }

@keyframes mft-shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* ── Empty state ── */
.mft-empty {
  padding: 2.5rem 1rem;
  text-align: center;
  color: #475569;
  font-size: 0.82rem;
}
</style>
