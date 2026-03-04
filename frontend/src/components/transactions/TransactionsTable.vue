<template>
  <div class="tt-wrap">
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
          <th>Date / Time</th>
          <th>Status</th>
          <th class="tt-num">Realized P&amp;L</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="t in transactions.transactions" :key="t.id" class="tt-row">
          <td class="tt-ticker">{{ t.ticker }}</td>
          <td>
            <span class="tt-badge" :class="t.type === 'long' ? 'tt-long' : 'tt-short'">
              {{ t.type === 'long' ? 'LONG' : 'SHORT' }}
            </span>
          </td>
          <td class="tt-num">₱{{ t.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}</td>
          <td class="tt-date">{{ new Date(t.date).toLocaleString('en-PH') }}</td>
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
  </div>
</template>

<script setup lang="ts">
import { useTransactionsStore } from '../../stores/transactions'

const transactions = useTransactionsStore()
</script>

<style scoped>
.tt-wrap {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  overflow: hidden;
}

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
