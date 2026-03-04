<template>
  <div class="tt-wrap">
    <!-- Header -->
    <div v-if="transactions.transactions.length" class="tt-header">
      <span class="tt-count">{{ transactions.transactions.length }} record{{ transactions.transactions.length !== 1 ? 's' : '' }}</span>
      <div v-if="!confirmClear" class="tt-clear-wrap">
        <button class="tt-clear-btn" @click="confirmClear = true">Clear History</button>
      </div>
      <div v-else class="tt-clear-confirm">
        <span class="tt-clear-warning">Remove all records?</span>
        <button class="tt-clear-yes" @click="doClear">Yes, clear</button>
        <button class="tt-clear-no" @click="confirmClear = false">Cancel</button>
      </div>
    </div>

    <!-- Empty state -->
    <div v-if="!transactions.transactions.length" class="tt-empty">
      <SprIcon icon="ph:list-bullets" class="tt-empty-icon" />
      <p>No transactions yet</p>
      <span>Place your first trade from the dashboard.</span>
    </div>

    <table v-else class="tt-table">
      <thead>
        <tr>
          <th>Stock</th>
          <th>Type</th>
          <th class="tt-num">Amount (PHP)</th>
          <th>Opened</th>
          <th>Closed</th>
          <th>Status</th>
          <th class="tt-num">Realized P&amp;L</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="t in paged" :key="t.id" class="tt-row">
          <td class="tt-ticker">{{ t.ticker }}</td>
          <td>
            <span class="tt-badge" :class="t.type === 'long' ? 'tt-long' : 'tt-short'">
              {{ t.type === 'long' ? 'LONG' : 'SHORT' }}
            </span>
          </td>
          <td class="tt-num">₱{{ t.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}</td>
          <td class="tt-date">{{ new Date(t.date).toLocaleString('en-PH') }}</td>
          <td class="tt-date">
            <span v-if="t.closedAt">{{ new Date(t.closedAt).toLocaleString('en-PH') }}</span>
            <span v-else class="tt-dash">—</span>
          </td>
          <td>
            <span class="tt-status" :class="`tt-status-${t.status}`">
              {{ t.status.toUpperCase() }}
            </span>
          </td>
          <td class="tt-num">
            <span v-if="t.realizedPnl !== undefined" :class="t.realizedPnl >= 0 ? 'tt-gain' : 'tt-loss'">
              {{ t.realizedPnl >= 0 ? '+' : '' }}₱{{ t.realizedPnl.toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}
            </span>
            <span v-else class="tt-dash">—</span>
          </td>
        </tr>
      </tbody>
    </table>

    <SprTablePagination
      v-if="transactions.transactions.length"
      :total-items="transactions.transactions.length"
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
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useTransactionsStore } from '../../stores/transactions'

const transactions = useTransactionsStore()
const confirmClear = ref(false)

const page = ref(1)
const pageSize = ref(10)
const pageSizeOptions = [
  { text: '10', value: '10' },
  { text: '20', value: '20' },
  { text: '50', value: '50' },
]

const totalPages = computed(() => Math.ceil(transactions.transactions.length / pageSize.value) || 1)
const paged = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return transactions.transactions.slice(start, start + pageSize.value)
})

function onPageSizeChange(val: number) {
  pageSize.value = val
  page.value = 1
}

function doClear() {
  transactions.clear()
  confirmClear.value = false
  page.value = 1
}
</script>

<style scoped>
.tt-wrap {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  overflow: hidden;
}

/* ── Header ── */
.tt-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.6rem 1rem;
  border-bottom: 1px solid #e2e8f0;
  background: #f8fafc;
}

.tt-count {
  font-size: 0.75rem;
  color: #94a3b8;
  font-weight: 600;
}

.tt-clear-btn {
  font-size: 0.75rem;
  font-weight: 600;
  color: #b91c1c;
  background: none;
  border: 1px solid #fca5a5;
  border-radius: 5px;
  padding: 0.25rem 0.65rem;
  cursor: pointer;
  transition: background 0.15s;
}

.tt-clear-btn:hover { background: #fee2e2; }

.tt-clear-confirm {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.tt-clear-warning {
  font-size: 0.75rem;
  color: #b91c1c;
  font-weight: 600;
}

.tt-clear-yes {
  font-size: 0.75rem;
  font-weight: 700;
  color: #fff;
  background: #b91c1c;
  border: none;
  border-radius: 5px;
  padding: 0.25rem 0.65rem;
  cursor: pointer;
}

.tt-clear-yes:hover { background: #991b1b; }

.tt-clear-no {
  font-size: 0.75rem;
  font-weight: 600;
  color: #64748b;
  background: none;
  border: 1px solid #e2e8f0;
  border-radius: 5px;
  padding: 0.25rem 0.65rem;
  cursor: pointer;
}

.tt-clear-no:hover { background: #f1f5f9; }

.tt-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
}

thead tr {
  background: #f8fafc;
}

th {
  padding: 0.65rem 1rem;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #94a3b8;
  text-align: left;
  border-bottom: 1px solid #e2e8f0;
  white-space: nowrap;
}

th.tt-num { text-align: right; }

.tt-row {
  border-bottom: 1px solid #f1f5f9;
  transition: background 0.1s;
}

.tt-row:last-child { border-bottom: none; }
.tt-row:hover { background: #f8fafc; }

td {
  padding: 0.65rem 1rem;
  color: #334155;
  white-space: nowrap;
}

td.tt-num { text-align: right; }

.tt-ticker {
  font-weight: 700;
  color: #0f172a;
  font-family: monospace;
}

.tt-date {
  color: #64748b;
  font-size: 0.8rem;
}

/* ── Badges ── */
.tt-badge {
  display: inline-block;
  font-size: 0.65rem;
  font-weight: 800;
  padding: 0.15rem 0.45rem;
  border-radius: 4px;
  letter-spacing: 0.05em;
}

.tt-long  { background: #dcfce7; color: #15803d; }
.tt-short { background: #fee2e2; color: #b91c1c; }

.tt-status {
  display: inline-block;
  font-size: 0.65rem;
  font-weight: 700;
  padding: 0.15rem 0.45rem;
  border-radius: 4px;
  letter-spacing: 0.05em;
}

.tt-status-open    { background: #dcfce7; color: #15803d; }
.tt-status-closed  { background: #e0f2fe; color: #0369a1; }
.tt-status-pending { background: #fef9c3; color: #92400e; }

/* ── P&L ── */
.tt-gain { color: #15803d; font-weight: 600; }
.tt-loss { color: #b91c1c; font-weight: 600; }
.tt-dash { color: #94a3b8; }

/* ── Empty state ── */
.tt-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1rem;
  color: #94a3b8;
  gap: 0.4rem;
}

.tt-empty-icon {
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
}

.tt-empty p {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: #475569;
}

.tt-empty span {
  font-size: 0.82rem;
}
</style>
