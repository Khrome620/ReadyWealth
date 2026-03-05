<template>
  <div class="ap-root">
    <SprCard title="Advice Corner" tone="information" header-icon="ph:lightbulb" :show-footer="false" class="ap-card">
      <template #content>
        <SprBanner>
          Not financial advice — for informational purposes only.
        </SprBanner>

        <div v-if="advice.recommendations.length === 0" class="ap-empty">
          Market data loading...
        </div>

        <div class="ap-list">
          <RecommendationCard
            v-for="rec in advice.recommendations"
            :key="rec.ticker"
            :rec="rec"
            @trade="handleTrade"
            @details="openDetails"
          />
        </div>
      </template>
    </SprCard>
  </div>

  <TradeModal
    v-model="showTradeModal"
    order-type="long"
    :prefill-ticker="tradeTicker"
  />

  <!-- Investment details modal -->
  <Teleport to="body">
    <Transition name="ap-fade">
      <div v-if="detailRec" class="ap-modal-overlay" @click.self="detailRec = null">
        <div class="ap-modal">
          <div class="ap-modal-header">
            <div class="ap-modal-title-group">
              <span class="ap-modal-ticker">{{ detailRec.ticker }}</span>
              <span class="ap-modal-name">{{ detailRec.name }}</span>
            </div>
            <button class="ap-modal-close" @click="detailRec = null">✕</button>
          </div>
          <div class="ap-modal-badge-row">
            <span class="ap-modal-price">{{ formatPHP(detailRec.currentPrice) }}</span>
            <span class="ap-conf-badge" :class="`ap-conf-${detailRec.confidence}`">
              {{ detailRec.confidence.toUpperCase() }} CONFIDENCE
            </span>
          </div>
          <p class="ap-modal-reason">{{ detailRec.reason }}</p>
          <hr class="ap-modal-divider" />
          <h4 class="ap-modal-desc-heading">Why invest in {{ detailRec.ticker }}?</h4>
          <p class="ap-modal-desc">{{ detailRec.description }}</p>
          <div class="ap-modal-actions">
            <SprButton tone="neutral" variant="secondary" @click="detailRec = null">Close</SprButton>
            <SprButton tone="success" variant="primary" @click="handleTradeFromModal">
              Trade {{ detailRec.ticker }}
            </SprButton>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import RecommendationCard from './RecommendationCard.vue'
import TradeModal from '../wallet/TradeModal.vue'
import { useAdviceStore } from '../../stores/advice'
import type { Recommendation } from '../../types'

const advice = useAdviceStore()
const showTradeModal = ref(false)
const tradeTicker = ref('')
const detailRec = ref<Recommendation | null>(null)

function handleTrade(ticker: string) {
  tradeTicker.value = ticker
  showTradeModal.value = true
}

function openDetails(rec: Recommendation) {
  detailRec.value = rec
}

function handleTradeFromModal() {
  if (!detailRec.value) return
  tradeTicker.value = detailRec.value.ticker
  detailRec.value = null
  showTradeModal.value = true
}

function formatPHP(n: number) {
  return n > 0 ? `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2 })}` : '—'
}
</script>

<style scoped>
.ap-root {
  height: 100%;
  display: flex;
  flex-direction: column;
}

/* Force SprCard to stretch full height */
.ap-root :deep(.spr-card),
.ap-root :deep(.spr-card__body),
.ap-card {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.ap-root :deep(.spr-card__content) {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

.ap-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 0.75rem;
}
.ap-empty {
  text-align: center;
  padding: 1rem;
  color: #64748b;
  font-size: 0.875rem;
}

/* ── Modal overlay ── */
.ap-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.ap-modal {
  background: #fff;
  border-radius: 16px;
  max-width: 680px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  padding: 2rem 2.25rem;
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.3);
}

.ap-modal-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 0.85rem;
}

.ap-modal-title-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.ap-modal-ticker {
  font-size: 1.75rem;
  font-weight: 800;
  color: #1e293b;
  font-family: monospace;
}

.ap-modal-name {
  font-size: 1rem;
  color: #64748b;
}

.ap-modal-close {
  background: none;
  border: none;
  font-size: 1.25rem;
  color: #94a3b8;
  cursor: pointer;
  padding: 0.3rem 0.5rem;
  border-radius: 6px;
  line-height: 1;
}
.ap-modal-close:hover { background: #f1f5f9; color: #1e293b; }

.ap-modal-badge-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 0.85rem;
}

.ap-modal-price {
  font-size: 1.35rem;
  font-weight: 700;
  color: #1e293b;
}

.ap-conf-badge {
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.07em;
  padding: 0.3rem 0.75rem;
  border-radius: 999px;
}
.ap-conf-high   { background: #dcfce7; color: #16a34a; }
.ap-conf-medium { background: #fef9c3; color: #b45309; }
.ap-conf-low    { background: #fee2e2; color: #dc2626; }

.ap-modal-reason {
  font-size: 1rem;
  color: #475569;
  margin: 0 0 1rem;
  font-style: italic;
  line-height: 1.6;
}

.ap-modal-divider {
  border: none;
  border-top: 1px solid #e2e8f0;
  margin: 1rem 0;
}

.ap-modal-desc-heading {
  font-size: 0.85rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #94a3b8;
  margin: 0 0 0.75rem;
}

.ap-modal-desc {
  font-size: 1rem;
  color: #334155;
  line-height: 1.8;
  margin: 0 0 1.75rem;
}

.ap-modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

/* ── Fade transition ── */
.ap-fade-enter-active,
.ap-fade-leave-active {
  transition: opacity 0.18s ease;
}
.ap-fade-enter-from,
.ap-fade-leave-to {
  opacity: 0;
}
</style>
