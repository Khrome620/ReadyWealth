import { onMounted, onUnmounted } from 'vue'
import { useMarketStore } from '../stores/market'

const FIFTEEN_MINUTES = 15 * 60 * 1000

export function useMarketFeed() {
  const market = useMarketStore()
  let intervalId: ReturnType<typeof setInterval> | null = null

  onMounted(async () => {
    await market.refresh()
    intervalId = setInterval(() => market.refresh(), FIFTEEN_MINUTES)
  })

  onUnmounted(() => {
    if (intervalId !== null) clearInterval(intervalId)
  })

  return { market }
}
