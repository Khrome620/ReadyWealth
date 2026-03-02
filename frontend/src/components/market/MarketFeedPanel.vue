<template>
  <SprCard title="PSE Market Feed" tone="plain" :show-footer="false">
    <template #header>
      <div class="mfp-header rw-flex-gap">
        <SprStatus :state="market.marketOpen ? 'success' : 'danger'" size="sm" />
        <span class="mfp-status-label">{{ market.marketOpen ? 'Market Open' : 'Market Closed' }}</span>
        <span v-if="market.lastUpdated" class="mfp-last-updated">
          · Updated {{ formatTime(market.lastUpdated) }}
        </span>
      </div>
    </template>

    <template #content>
      <div v-if="market.error" class="mfp-error">
        Failed to load market data.
        {{ market.lastUpdated ? `Last updated: ${formatTime(market.lastUpdated)}` : '' }}
      </div>

      <SprBanner>
        Prices delayed ~15 minutes. Not real-time data.
      </SprBanner>

      <SprTabs
        :list="tabs"
        :active-tab="activeTab"
        :underlined="true"
        @tab-index="onTabChange"
      />

      <MarketFeedTable :stocks="currentStocks" :loading="market.loading" />
    </template>
  </SprCard>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import MarketFeedTable from './MarketFeedTable.vue'
import { useMarketStore } from '../../stores/market'
import { useWatchlistStore } from '../../stores/watchlist'

const market = useMarketStore()
const watchlist = useWatchlistStore()

const tabs = ['Top Gainers', 'Top Losers', 'Most Active', 'Watchlist']
const activeTab = ref('Top Gainers')

function onTabChange(index: number) {
  activeTab.value = tabs[index]
}

const currentStocks = computed(() => {
  switch (activeTab.value) {
    case 'Top Gainers': return market.topGainers
    case 'Top Losers':  return market.topLosers
    case 'Most Active': return market.mostActive
    case 'Watchlist':   return watchlist.watchlistStocks
    default:            return market.topGainers
  }
})

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })
}
</script>

<style scoped>
.mfp-header {
  width: 100%;
}
.mfp-status-label {
  font-weight: 600;
  font-size: 0.875rem;
}
.mfp-last-updated {
  font-size: 0.75rem;
  color: #64748b;
}
.mfp-error {
  color: #dc2626;
  padding: 0.5rem 0;
  font-size: 0.875rem;
}
</style>
