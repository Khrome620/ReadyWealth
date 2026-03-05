<template>
  <div class="mfp-dark-card">
    <!-- Header -->
    <div class="mfp-header">
      <div class="mfp-header-left">
        <span class="mfp-header-icon"><SprIcon icon="ph:chart-line-up" /></span>
        <span class="mfp-title">PSE Market Feed</span>
        <div class="mfp-status-pill" :class="market.marketOpen ? 'mfp-open' : 'mfp-closed'">
          <span class="mfp-status-dot"></span>
          {{ market.marketOpen ? 'Live' : 'Closed' }}
        </div>
      </div>
      <span v-if="market.lastUpdated" class="mfp-updated" :class="{ 'mfp-flash': flashing }">
        ↻ {{ secondsAgo }}s ago
      </span>
    </div>

    <!-- Delayed notice -->
    <div class="mfp-notice">
      <SprIcon icon="ph:info" class="mfp-notice-icon" />
      Prices delayed ~15 min. Not real-time data.
    </div>

    <!-- Tabs -->
    <div class="mfp-tabs">
      <button
        v-for="tab in tabs"
        :key="tab"
        class="mfp-tab"
        :class="{ 'mfp-tab-active': activeTab === tab }"
        @click="activeTab = tab"
      >
        {{ tab }}
      </button>
    </div>

    <!-- Table -->
    <MarketFeedTable :stocks="currentStocks" :loading="market.loading" :market-open="market.marketOpen" />

    <!-- Error -->
    <div v-if="market.error" class="mfp-error">
      <SprIcon icon="ph:warning" /> Failed to load market data.
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import MarketFeedTable from './MarketFeedTable.vue'
import { useMarketStore } from '../../stores/market'
import { useWatchlistStore } from '../../stores/watchlist'

const market = useMarketStore()
const watchlist = useWatchlistStore()

const tabs = ['Top Gainers', 'Top Losers', 'Most Active', 'Watchlist']
const activeTab = ref('Top Gainers')

const currentStocks = computed(() => {
  switch (activeTab.value) {
    case 'Top Gainers': return market.topGainers
    case 'Top Losers':  return market.topLosers
    case 'Most Active': return market.mostActive
    case 'Watchlist':   return watchlist.watchlistStocks
    default:            return market.topGainers
  }
})

// Ticking "Xs ago" counter
const secondsAgo = ref(0)
const flashing = ref(false)
let tickerId: ReturnType<typeof setInterval> | null = null

watch(() => market.lastUpdated, () => {
  secondsAgo.value = 0
  flashing.value = true
  setTimeout(() => { flashing.value = false }, 600)
})

tickerId = setInterval(() => {
  if (market.lastUpdated) {
    secondsAgo.value = Math.floor((Date.now() - market.lastUpdated.getTime()) / 1000)
  }
}, 1000)

onUnmounted(() => {
  if (tickerId !== null) clearInterval(tickerId)
})
</script>

<style scoped>
.mfp-dark-card {
  background: #0f172a;
  border-radius: 12px;
  border: 1px solid #1e293b;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  height: 100%;
}

/* ── Header ── */
.mfp-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem 0.75rem;
  border-bottom: 1px solid #1e293b;
}

.mfp-header-left {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.mfp-header-icon {
  color: #38bdf8;
  font-size: 1.1rem;
  display: flex;
  align-items: center;
}

.mfp-title {
  font-size: 0.9rem;
  font-weight: 700;
  color: #f1f5f9;
  letter-spacing: 0.02em;
}

.mfp-status-pill {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
}

.mfp-open {
  background: rgba(34, 197, 94, 0.15);
  color: #4ade80;
  border: 1px solid rgba(34, 197, 94, 0.3);
}

.mfp-closed {
  background: rgba(239, 68, 68, 0.12);
  color: #f87171;
  border: 1px solid rgba(239, 68, 68, 0.25);
}

.mfp-status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

.mfp-open .mfp-status-dot {
  animation: mfp-pulse 1.5s ease-in-out infinite;
}

@keyframes mfp-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

.mfp-updated {
  font-size: 0.7rem;
  color: #475569;
  transition: color 0.3s;
}

.mfp-flash {
  color: #4ade80;
}

/* ── Notice ── */
.mfp-notice {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.7rem;
  color: #475569;
  padding: 0.45rem 1.25rem;
  background: #0a1120;
  border-bottom: 1px solid #1e293b;
}

.mfp-notice-icon {
  font-size: 0.8rem;
  flex-shrink: 0;
}

/* ── Tabs ── */
.mfp-tabs {
  display: flex;
  gap: 0;
  padding: 0 1.25rem;
  border-bottom: 1px solid #1e293b;
}

.mfp-tab {
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  padding: 0.6rem 0.9rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: #64748b;
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s;
  white-space: nowrap;
  margin-bottom: -1px;
}

.mfp-tab:hover {
  color: #94a3b8;
}

.mfp-tab-active {
  color: #38bdf8;
  border-bottom-color: #38bdf8;
}

/* ── Error ── */
.mfp-error {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.8rem;
  color: #f87171;
  padding: 0.75rem 1.25rem;
}
</style>
