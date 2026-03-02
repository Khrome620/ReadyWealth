<template>
  <SprCard title="Advice Corner" tone="information" :show-footer="false">
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
        />
      </div>
    </template>
  </SprCard>

  <TradeModal
    v-model="showModal"
    order-type="long"
    :prefill-ticker="tradeTicker"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import RecommendationCard from './RecommendationCard.vue'
import TradeModal from '../wallet/TradeModal.vue'
import { useAdviceStore } from '../../stores/advice'

const advice = useAdviceStore()
const showModal = ref(false)
const tradeTicker = ref('')

function handleTrade(ticker: string) {
  tradeTicker.value = ticker
  showModal.value = true
}
</script>

<style scoped>
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
</style>
