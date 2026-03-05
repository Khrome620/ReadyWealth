<template>
  <div class="rec-card">
    <div class="rec-header">
      <div>
        <span class="rec-ticker">{{ rec.ticker }}</span>
        <span class="rec-name">{{ rec.name }}</span>
      </div>
      <SprLozenge
        :label="rec.confidence.toUpperCase()"
        :tone="confidenceTone"
        :fill="true"
      />
    </div>
    <p class="rec-reason">{{ rec.reason }}</p>
    <div class="rec-footer">
      <span class="rec-price">{{ formatPHP(rec.currentPrice) }}</span>
      <div class="rec-actions">
        <SprButton
          v-if="rec.description"
          tone="neutral"
          variant="tertiary"
          size="small"
          @click="emit('details', rec)"
        >
          Why invest?
        </SprButton>
        <SprButton tone="neutral" variant="secondary" size="small" @click="emit('trade', rec.ticker)">
          Trade
        </SprButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Recommendation } from '../../types'

const props = defineProps<{ rec: Recommendation }>()
const emit = defineEmits<{
  trade: [ticker: string]
  details: [rec: Recommendation]
}>()

const confidenceTone = computed(() => {
  if (props.rec.confidence === 'high') return 'success'
  if (props.rec.confidence === 'medium') return 'caution'
  return 'danger'
})

function formatPHP(n: number) {
  return n > 0 ? `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2 })}` : '—'
}
</script>

<style scoped>
.rec-card {
  border: 1px solid #e2e8f0;
  border-radius: 0.5rem;
  padding: 0.75rem;
  background: #fff;
}
.rec-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.25rem;
  gap: 0.5rem;
}
.rec-ticker {
  font-weight: 700;
  font-size: 0.95rem;
  margin-right: 0.4rem;
}
.rec-name {
  font-size: 0.78rem;
  color: #64748b;
}
.rec-reason {
  font-size: 0.8rem;
  color: #64748b;
  margin: 0.25rem 0 0.5rem;
}
.rec-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}
.rec-price {
  font-size: 0.88rem;
  font-weight: 600;
  color: #1e293b;
}
.rec-actions {
  display: flex;
  gap: 0.4rem;
}
</style>
