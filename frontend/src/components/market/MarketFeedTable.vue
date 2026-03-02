<template>
  <SprTable :headers="headers" :data-table="tableData" :loading="loading" variant="white" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Stock } from '../../types'

const props = defineProps<{
  stocks: Stock[]
  loading?: boolean
}>()

const headers = [
  { field: 'ticker',    name: 'Ticker' },
  { field: 'name',      name: 'Stock' },
  { field: 'price',     name: 'Price (PHP)' },
  { field: 'change',    name: 'Change' },
  { field: 'changePct', name: 'Change %' },
  { field: 'volume',    name: 'Volume' },
]

const tableData = computed(() =>
  props.stocks.map(s => ({
    ticker:    s.ticker,
    name:      s.name,
    price:     `₱${s.price.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
    change: {
      title: {
        label: `${s.change >= 0 ? '+' : ''}${s.change.toFixed(2)}`,
        tone: s.change >= 0 ? 'success' : 'danger',
      },
    },
    changePct: {
      title: {
        label: `${s.changePct >= 0 ? '+' : ''}${s.changePct.toFixed(2)}%`,
        tone: s.changePct >= 0 ? 'success' : 'danger',
      },
    },
    volume: s.volume.toLocaleString(),
  }))
)
</script>
