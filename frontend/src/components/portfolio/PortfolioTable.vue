<template>
  <SprTable
    :headers="headers"
    :data-table="tableData"
    :action="true"
    variant="white"
    :full-height="false"
  >
    <template #action-name>Actions</template>

    <template #action="{ row }">
      <SprButton
        tone="danger"
        variant="tertiary"
        size="small"
        @click="openClose(String(row._id), String(row._ticker))"
      >
        Close
      </SprButton>
    </template>

    <template #empty-state>
      <SprEmptyState
        image="work-in-progress"
        description="No open positions"
        sub-description="Start trading from the dashboard."
        size="large"
        :has-button="true"
      >
        <template #button>
          <SprButton tone="neutral" variant="primary" @click="$router.push('/')">
            Go to Dashboard
          </SprButton>
        </template>
      </SprEmptyState>
    </template>
  </SprTable>

  <ClosePositionModal
    v-if="closeTarget"
    v-model="showCloseModal"
    :position-id="closeTarget.id"
    :ticker="closeTarget.ticker"
    @closed="closeTarget = null"
  />
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import ClosePositionModal from './ClosePositionModal.vue'
import { usePositionsStore } from '../../stores/positions'

const positions = usePositionsStore()

const headers = [
  { field: 'ticker',       name: 'Stock' },
  { field: 'type',         name: 'Type' },
  { field: 'invested',     name: 'Invested (PHP)' },
  { field: 'currentValue', name: 'Current Value (PHP)' },
  { field: 'pnl',          name: 'Unrealized P&L' },
]

const tableData = computed(() =>
  positions.positionsWithCurrentValue.map(p => ({
    _id:          p.id,
    _ticker:      p.ticker,
    ticker:       p.ticker,
    type: {
      title: {
        label: p.type === 'long' ? 'LONG' : 'SHORT',
        tone:  p.type === 'long' ? 'success' : 'danger',
      },
    },
    invested:     `₱${p.investedAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
    currentValue: `₱${p.currentValue.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
    pnl: {
      title: {
        label: `${p.pnl >= 0 ? '+' : ''}₱${p.pnl.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
        tone:  p.pnl >= 0 ? 'success' : 'danger',
      },
    },
  }))
)

const showCloseModal = ref(false)
const closeTarget = ref<{ id: string; ticker: string } | null>(null)

function openClose(id: string, ticker: string) {
  closeTarget.value = { id, ticker }
  showCloseModal.value = true
}
</script>
