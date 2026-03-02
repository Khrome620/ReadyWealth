<template>
  <div class="rw-page rw-dashboard">
    <WalletPanel class="rw-wallet-panel" />
    <MarketFeedPanel class="rw-feed-panel" />
    <AdvicePanel class="rw-advice-panel" />
  </div>
</template>

<script setup lang="ts">
import WalletPanel from '../components/wallet/WalletPanel.vue'
import MarketFeedPanel from '../components/market/MarketFeedPanel.vue'
import AdvicePanel from '../components/advice/AdvicePanel.vue'
import { useMarketFeed } from '../composables/useMarketFeed'

useMarketFeed()
</script>
