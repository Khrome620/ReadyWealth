import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import router from '../router'
import { AuthService, type AuthUser, type LoginPayload } from '../services/AuthService'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<AuthUser | null>(null)
  const isAuthenticated = computed(() => user.value !== null)

  function setUser(u: AuthUser) {
    user.value = u
  }

  async function clearUser() {
    user.value = null
    // Reset all user-scoped stores — clears both in-memory state and localStorage
    const { useWalletStore } = await import('../stores/wallet')
    const { usePositionsStore } = await import('../stores/positions')
    const { useTransactionsStore } = await import('../stores/transactions')
    const { useWatchlistStore } = await import('../stores/watchlist')
    useWalletStore().reset()
    usePositionsStore().reset()
    useTransactionsStore().clear()
    useWatchlistStore().reset()
  }

  async function fetchMe(): Promise<boolean> {
    const me = await AuthService.fetchMe()
    if (me) {
      user.value = me
      return true
    }
    return false
  }

  async function login(payload: LoginPayload): Promise<void> {
    const u = await AuthService.login(payload)
    setUser(u)
  }

  async function logout(): Promise<void> {
    try {
      await AuthService.logout()
    } catch {
      // ignore backend errors — still clear local state and redirect
    }
    await clearUser()
    router.push('/login')
  }

  return { user, isAuthenticated, setUser, clearUser, fetchMe, login, logout }
})
