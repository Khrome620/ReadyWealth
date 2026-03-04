import { onMounted, onUnmounted } from 'vue'
import { useMarketStore } from '../stores/market'

// Refresh every 10 s when market is open; every 60 s when closed (prices are static).
const OPEN_INTERVAL_MS  = 5_000
const CLOSED_INTERVAL_MS = 60_000

export function useMarketFeed() {
  const market = useMarketStore()
  let intervalId: ReturnType<typeof setInterval> | null = null

  function scheduleNext() {
    if (intervalId !== null) clearInterval(intervalId)
    const delay = market.marketOpen ? OPEN_INTERVAL_MS : CLOSED_INTERVAL_MS
    intervalId = setInterval(async () => {
      await market.refresh()
      scheduleNext() // re-schedule in case open/closed status changed
    }, delay)
  }

  onMounted(async () => {
    await market.refresh()
    scheduleNext()
  })

  onUnmounted(() => {
    if (intervalId !== null) clearInterval(intervalId)
  })

  return { market }
}
