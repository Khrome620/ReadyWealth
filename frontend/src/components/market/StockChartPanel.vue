<template>
  <div class="scp-wrap">
    <!-- Header: back + identity + chart type toggle -->
    <div class="scp-header">
      <button class="scp-back" @click="emit('close')" title="Back to market feed">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M10 3L5 8L10 13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        Back
      </button>
      <div class="scp-identity">
        <span class="scp-ticker">{{ stock.ticker }}</span>
        <span class="scp-name">{{ stock.name }}</span>
      </div>
      <div class="scp-type-toggle">
        <button class="scp-type-btn" :class="{ 'scp-type-active': chartType === 'line' }" @click="setChartType('line')" title="Line chart">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <polyline points="1,11 4,7 7,9 10,4 13,2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
          </svg>
          Line
        </button>
        <button class="scp-type-btn" :class="{ 'scp-type-active': chartType === 'candle' }" @click="setChartType('candle')" title="Candlestick chart">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect x="2" y="4" width="3" height="6" rx="0.5" stroke="currentColor" stroke-width="1.5" fill="none"/>
            <line x1="3.5" y1="2" x2="3.5" y2="4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            <line x1="3.5" y1="10" x2="3.5" y2="12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            <rect x="9" y="5" width="3" height="5" rx="0.5" stroke="currentColor" stroke-width="1.5" fill="none"/>
            <line x1="10.5" y1="3" x2="10.5" y2="5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            <line x1="10.5" y1="10" x2="10.5" y2="12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
          Candles
        </button>
      </div>
    </div>

    <!-- Stats bar -->
    <div class="scp-stats">
      <div class="scp-stat">
        <span class="scp-stat-label">Price</span>
        <span class="scp-stat-value">₱{{ stock.price.toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}</span>
      </div>
      <div class="scp-stat">
        <span class="scp-stat-label">Change</span>
        <span class="scp-stat-value" :class="changeClass(stock.change)">
          {{ stock.change >= 0 ? '+' : '' }}{{ stock.change.toFixed(2) }}
        </span>
      </div>
      <div class="scp-stat">
        <span class="scp-stat-label">Change %</span>
        <span class="scp-stat-value" :class="changeClass(stock.changePct)">
          {{ stock.changePct >= 0 ? '▲' : '▼' }} {{ Math.abs(stock.changePct).toFixed(2) }}%
        </span>
      </div>
      <div class="scp-stat">
        <span class="scp-stat-label">Volume</span>
        <span class="scp-stat-value scp-volume">{{ stock.volume.toLocaleString() }}</span>
      </div>
    </div>

    <!-- Range filter bar -->
    <div class="scp-range-bar">
      <button
        v-for="r in RANGES"
        :key="r"
        class="scp-range-btn"
        :class="{ 'scp-range-active': selectedRange === r }"
        @click="setRange(r)"
      >{{ r }}</button>
    </div>

    <!-- Chart -->
    <div ref="chartContainer" class="scp-chart"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import {
  createChart,
  LineSeries,
  CandlestickSeries,
  type IChartApi,
  type ISeriesApi,
  type SeriesType,
  type Time,
} from 'lightweight-charts'
import { useMarketStore } from '../../stores/market'
import { generateRangeLineHistory, generateRangeCandleHistory, type TimeRange } from '../../utils/intradayHistory'
import type { Stock } from '../../types'

const props = defineProps<{ stock: Stock }>()
const emit = defineEmits<{ close: [] }>()

const RANGES: TimeRange[] = ['1D', '7D', '1M', '1Y', 'YTD', 'ALL']

const chartContainer = ref<HTMLDivElement | null>(null)
const market = useMarketStore()
const chartType = ref<'line' | 'candle'>('line')
const selectedRange = ref<TimeRange>('1D')

let chart: IChartApi | null = null
let activeSeries: ISeriesApi<SeriesType> | null = null
let ro: ResizeObserver | null = null

onMounted(() => nextTick(() => initChart()))
onUnmounted(() => destroyChart())

// Live price update — only meaningful for 1D (intraday)
watch(() => market.stocks, (stocks) => {
  if (!activeSeries || !chart || selectedRange.value !== '1D') return
  const updated = stocks.find(s => s.ticker === props.stock.ticker)
  if (!updated) return
  const nowSec = Math.floor(Date.now() / 1000) as Time
  if (chartType.value === 'line') {
    ;(activeSeries as ISeriesApi<'Line'>).update({ time: nowSec, value: updated.price })
  } else {
    ;(activeSeries as ISeriesApi<'Candlestick'>).update({
      time: nowSec, open: updated.price, high: updated.price, low: updated.price, close: updated.price,
    })
  }
})

function setChartType(type: 'line' | 'candle') {
  if (type === chartType.value) return
  chartType.value = type
  swapSeries()
}

function setRange(range: TimeRange) {
  if (range === selectedRange.value) return
  selectedRange.value = range
  refreshData()
}

/** Replace the active series with a new one (chart type changed). */
function swapSeries() {
  if (!chart) return
  if (activeSeries) { chart.removeSeries(activeSeries); activeSeries = null }
  mountSeries()
}

/** Keep the same series, just reload its data (range changed). */
function refreshData() {
  if (!activeSeries || !chart) return
  if (chartType.value === 'line') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(activeSeries as ISeriesApi<'Line'>).setData(generateRangeLineHistory(props.stock, selectedRange.value) as any)
  } else {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(activeSeries as ISeriesApi<'Candlestick'>).setData(generateRangeCandleHistory(props.stock, selectedRange.value) as any)
  }
  chart.timeScale().fitContent()
}

function mountSeries() {
  if (!chart) return
  if (chartType.value === 'line') {
    const s = chart.addSeries(LineSeries, { color: '#22d3ee', lineWidth: 2 })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    s.setData(generateRangeLineHistory(props.stock, selectedRange.value) as any)
    activeSeries = s
  } else {
    const s = chart.addSeries(CandlestickSeries, {
      upColor: '#4ade80', downColor: '#f87171',
      borderUpColor: '#4ade80', borderDownColor: '#f87171',
      wickUpColor: '#4ade80', wickDownColor: '#f87171',
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    s.setData(generateRangeCandleHistory(props.stock, selectedRange.value) as any)
    activeSeries = s
  }
  chart.timeScale().fitContent()
}

function initChart() {
  if (!chartContainer.value) return
  chart = createChart(chartContainer.value, {
    layout: { background: { color: '#0f172a' }, textColor: '#94a3b8' },
    grid: { vertLines: { color: '#1e293b' }, horzLines: { color: '#1e293b' } },
    timeScale: { timeVisible: true, secondsVisible: false },
    width: chartContainer.value.clientWidth,
    height: chartContainer.value.clientHeight || 320,
  })
  mountSeries()
  ro = new ResizeObserver(() => {
    if (chart && chartContainer.value) {
      chart.applyOptions({
        width: chartContainer.value.clientWidth,
        height: chartContainer.value.clientHeight || 320,
      })
    }
  })
  ro.observe(chartContainer.value)
}

function destroyChart() {
  ro?.disconnect()
  chart?.remove()
  chart = null; activeSeries = null; ro = null
}

function changeClass(val: number): string {
  return val > 0 ? 'scp-up' : val < 0 ? 'scp-down' : 'scp-flat'
}
</script>

<style scoped>
.scp-wrap {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #0f172a;
}

/* ── Header ── */
.scp-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.6rem 1rem;
  border-bottom: 1px solid #1e293b;
  flex-shrink: 0;
}

.scp-back {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  background: none;
  border: 1px solid #1e293b;
  border-radius: 6px;
  color: #94a3b8;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.3rem 0.6rem;
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s;
  flex-shrink: 0;
}

.scp-back:hover { color: #f1f5f9; border-color: #38bdf8; }

.scp-identity {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  min-width: 0;
  flex: 1;
}

.scp-ticker {
  font-weight: 700;
  color: #38bdf8;
  font-family: monospace;
  font-size: 0.95rem;
  flex-shrink: 0;
}

.scp-name {
  color: #64748b;
  font-size: 0.78rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ── Chart type toggle ── */
.scp-type-toggle {
  display: flex;
  gap: 0.25rem;
  flex-shrink: 0;
}

.scp-type-btn {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  background: none;
  border: 1px solid #1e293b;
  border-radius: 6px;
  color: #64748b;
  font-size: 0.72rem;
  font-weight: 600;
  padding: 0.28rem 0.55rem;
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s, background 0.15s;
}

.scp-type-btn:hover { color: #94a3b8; border-color: #334155; }

.scp-type-active {
  background: #1e293b;
  border-color: #38bdf8 !important;
  color: #38bdf8 !important;
}

/* ── Stats bar ── */
.scp-stats {
  display: flex;
  gap: 1.5rem;
  padding: 0.6rem 1rem;
  border-bottom: 1px solid #1e293b;
  flex-shrink: 0;
  flex-wrap: wrap;
}

.scp-stat { display: flex; flex-direction: column; gap: 0.1rem; }

.scp-stat-label {
  font-size: 0.6rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #475569;
}

.scp-stat-value {
  font-size: 0.88rem;
  font-weight: 700;
  color: #f1f5f9;
  font-variant-numeric: tabular-nums;
}

.scp-volume { color: #64748b; }
.scp-up     { color: #4ade80; }
.scp-down   { color: #f87171; }
.scp-flat   { color: #94a3b8; }

/* ── Range filter bar ── */
.scp-range-bar {
  display: flex;
  gap: 0.25rem;
  padding: 0.45rem 1rem;
  border-bottom: 1px solid #1e293b;
  flex-shrink: 0;
}

.scp-range-btn {
  background: none;
  border: 1px solid transparent;
  border-radius: 5px;
  color: #64748b;
  font-size: 0.72rem;
  font-weight: 700;
  padding: 0.2rem 0.55rem;
  cursor: pointer;
  transition: color 0.15s, background 0.15s, border-color 0.15s;
  letter-spacing: 0.04em;
}

.scp-range-btn:hover { color: #94a3b8; background: #1e293b; }

.scp-range-active {
  background: #1e293b !important;
  border-color: #38bdf8 !important;
  color: #38bdf8 !important;
}

/* ── Chart ── */
.scp-chart {
  flex: 1;
  min-height: 0;
  width: 100%;
  background: #0f172a;
}
</style>
