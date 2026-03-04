<template>
  <SprTable
    :headers="headers"
    :data-table="tableData"
    variant="white"
    :full-height="false"
  >
    <template #empty-state>
      <SprEmptyState
        image="list"
        description="No transactions yet"
        sub-description="Place your first trade from the dashboard."
        size="large"
      />
    </template>
  </SprTable>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useTransactionsStore } from '../../stores/transactions'

const transactions = useTransactionsStore()

const headers = [
  { field: 'ticker', name: 'Stock' },
  { field: 'type',   name: 'Type' },
  { field: 'amount', name: 'Amount (PHP)' },
  { field: 'date',   name: 'Date / Time' },
  { field: 'status', name: 'Status' },
]

const statusTone: Record<string, string> = {
  open:    'success',
  closed:  'information',
  pending: 'caution',
}

const tableData = computed(() =>
  transactions.transactions.map(t => ({
    ticker: t.ticker,
    type: {
      title: {
        label: t.type === 'long' ? 'LONG' : 'SHORT',
        tone:  t.type === 'long' ? 'success' : 'danger',
      },
    },
    amount: `₱${t.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
    date:   new Date(t.date).toLocaleString('en-PH'),
    status: {
      title: {
        label: t.status.toUpperCase(),
        tone:  statusTone[t.status] ?? 'information',
      },
    },
  }))
)
</script>
