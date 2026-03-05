import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useMarketStore } from './market'
import type { Stock } from '../types'
import type { Recommendation } from '../types'

export const useAdviceStore = defineStore('advice', () => {
  const market = useMarketStore()

  // Set by fetchRecommendations() when the API is available; null = use computed fallback
  const _fetched = ref<Recommendation[] | null>(null)
  const generatedAt = ref<string | null>(null)
  const unavailableUntil = ref<string | null>(null)

  /** Tickers we always feature in the advice corner. */
  const FEATURED_TICKERS = ['SM', 'SMPH', 'DMC', 'GLO', 'EMP']

  /**
   * Generates a technical-analysis-based description from live stock metrics.
   * Analyses momentum, volume intensity, volatility and trend signals.
   */
  function buildTechnicalAnalysis(s: Stock): string {
    const lines: string[] = []

    // ── Momentum signal ──────────────────────────────────────────────
    const absPct = Math.abs(s.changePct)
    if (s.changePct > 3) {
      lines.push(
        `${s.ticker} is showing a strong bullish breakout with a +${s.changePct.toFixed(2)}% intraday gain, suggesting significant buying pressure and potential continuation of the uptrend.`
      )
    } else if (s.changePct > 1) {
      lines.push(
        `${s.ticker} is posting a healthy +${s.changePct.toFixed(2)}% gain today, indicating steady accumulation by institutional buyers and positive short-term momentum.`
      )
    } else if (s.changePct >= 0) {
      lines.push(
        `${s.ticker} is trading marginally higher (+${s.changePct.toFixed(2)}%), consolidating near its current price level — a potential base-building phase before the next leg up.`
      )
    } else if (s.changePct > -1) {
      lines.push(
        `${s.ticker} is experiencing mild selling pressure (-${absPct.toFixed(2)}%), which may represent a healthy pullback to a near-term support zone and a potential re-entry opportunity.`
      )
    } else {
      lines.push(
        `${s.ticker} is down -${absPct.toFixed(2)}% on the session; however, elevated volume on the decline may indicate a capitulation event, often a precursor to a reversal.`
      )
    }

    // ── Price level context ───────────────────────────────────────────
    const price = s.price
    const prevClose = price - s.change
    const supportEst = +(prevClose * 0.97).toFixed(2)
    const resistanceEst = +(prevClose * 1.03).toFixed(2)
    lines.push(
      `Current price of ₱${price.toLocaleString('en-PH', { minimumFractionDigits: 2 })} sits between estimated near-term support at ₱${supportEst.toLocaleString('en-PH', { minimumFractionDigits: 2 })} and resistance at ₱${resistanceEst.toLocaleString('en-PH', { minimumFractionDigits: 2 })} (±3% of previous close ₱${prevClose.toLocaleString('en-PH', { minimumFractionDigits: 2 })}).`
    )

    // ── Volume analysis ───────────────────────────────────────────────
    const vol = s.volume
    if (vol > 3_000_000) {
      lines.push(
        `Trading volume is exceptionally high at ${vol.toLocaleString()} shares, strongly confirming the price move and signalling broad market participation — a reliable bullish signal.`
      )
    } else if (vol > 1_000_000) {
      lines.push(
        `Volume of ${vol.toLocaleString()} shares is above average, lending conviction to the current price direction and reducing the risk of a false breakout.`
      )
    } else if (vol > 300_000) {
      lines.push(
        `Moderate volume of ${vol.toLocaleString()} shares suggests steady but selective interest. A volume expansion on the next session would confirm trend strength.`
      )
    } else {
      lines.push(
        `Light volume of ${vol.toLocaleString()} shares warrants caution — thin trading can cause exaggerated moves. Watch for volume confirmation before sizing up a position.`
      )
    }

    // ── Relative change signal ────────────────────────────────────────
    if (s.changePct > 0 && vol > 1_000_000) {
      lines.push(
        `The combination of a positive price change and high volume is a classic "up on volume" pattern, one of the strongest technical buy signals in momentum analysis.`
      )
    } else if (s.changePct < 0 && vol > 1_000_000) {
      lines.push(
        `A decline on elevated volume may signal distribution by larger players; however, it can also mark a washout low — monitor the next 1–2 sessions for a reversal candle.`
      )
    } else if (absPct < 0.5) {
      lines.push(
        `The narrow trading range today suggests a period of indecision or equilibrium between buyers and sellers. A decisive break above resistance on volume would be a strong entry trigger.`
      )
    }

    return lines.join(' ')
  }

  /** Confidence level derived from technical signals. */
  function deriveConfidence(s: Stock): Recommendation['confidence'] {
    if (s.changePct > 2 && s.volume > 1_000_000) return 'high'
    if (s.changePct > 0 && s.volume > 500_000) return 'medium'
    if (s.changePct > 0) return 'medium'
    return 'low'
  }

  /** Short reason line shown on the card. */
  function buildReason(s: Stock): string {
    const absPct = Math.abs(s.changePct)
    if (s.changePct > 2) return `Strong bullish momentum (+${s.changePct.toFixed(2)}%) on high volume`
    if (s.changePct > 0) return `Positive price action (+${s.changePct.toFixed(2)}%) with steady volume`
    if (s.changePct === 0) return `Consolidating near support — watch for breakout`
    if (s.changePct > -1) return `Minor pullback (-${absPct.toFixed(2)}%) near key support zone`
    return `High-volume decline (-${absPct.toFixed(2)}%) — potential capitulation reversal`
  }

  /** Derived locally from market store — used as fallback in mock/offline mode. */
  const _computed = computed<Recommendation[]>(() => {
    if (!market.stocks.length) return []

    return FEATURED_TICKERS
      .map(ticker => market.stocks.find(s => s.ticker === ticker))
      .filter((s): s is Stock => s !== undefined)
      .map(s => ({
        ticker: s.ticker,
        name: s.name,
        currentPrice: s.price,
        reason: buildReason(s),
        confidence: deriveConfidence(s),
        description: buildTechnicalAnalysis(s),
      }))
  })

  /** Visible recommendations: API result when available, else computed fallback. */
  const recommendations = computed<Recommendation[]>(() => _fetched.value ?? _computed.value)

  /** Fetch recommendations from the API. Falls back to computed on 503. */
  async function fetchRecommendations(): Promise<void> {
    try {
      const res = await fetch('/api/v1/recommendations')
      if (res.status === 503) {
        const data = await res.json()
        unavailableUntil.value = data.retryAfter ?? null
        _fetched.value = null
        return
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      _fetched.value = (data.recommendations as Array<{
        ticker: string
        name: string
        currentPrice: number
        reason: string
        confidence: string
      }>).map(r => ({
        ticker: r.ticker,
        name: r.name,
        currentPrice: r.currentPrice,
        reason: r.reason,
        confidence: r.confidence as Recommendation['confidence'],
      }))
      generatedAt.value = data.generatedAt ?? null
      unavailableUntil.value = null
    } catch {
      // Network failure — stay with computed fallback, keep existing state
    }
  }

  return { recommendations, generatedAt, unavailableUntil, fetchRecommendations }
})
