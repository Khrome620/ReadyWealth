import { createRouter, createWebHistory } from 'vue-router'
import DashboardView from '../views/DashboardView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', name: 'login', component: () => import('../views/LoginView.vue'), meta: { public: true } },
    { path: '/', name: 'dashboard', component: DashboardView },
    { path: '/portfolio', name: 'portfolio', component: () => import('../views/PortfolioView.vue') },
    { path: '/transactions', name: 'transactions', component: () => import('../views/TransactionsView.vue') },
  ],
})

router.beforeEach(async (to) => {
  const { useAuthStore } = await import('../stores/auth')
  const auth = useAuthStore()

  if (to.meta.public) return true

  // Restore session from JWT cookie on page refresh (auth lives in memory only)
  if (!auth.isAuthenticated) {
    await auth.fetchMe()
  }

  if (auth.isAuthenticated) {
    const { useWalletStore } = await import('../stores/wallet')
    const { usePositionsStore } = await import('../stores/positions')
    const { useTransactionsStore } = await import('../stores/transactions')
    const wallet = useWalletStore()
    const positions = usePositionsStore()
    const txStore = useTransactionsStore()

    // Fetch server data once per session (reset on logout resets initialized flags)
    if (wallet.balance === 0) wallet.fetchBalance()
    if (!positions.initialized) positions.fetchPositions()
    if (!txStore.initialized) txStore.fetchTransactions()

    return true
  }

  return { name: 'login', query: { redirect: to.fullPath } }
})

export default router
