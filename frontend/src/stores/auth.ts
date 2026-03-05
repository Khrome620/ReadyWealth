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
    // Clear all user-specific local storage
    localStorage.removeItem('rw_wallet_balance')
    localStorage.removeItem('rw_positions')
    localStorage.removeItem('rw_transactions')
    // Reset server-sourced stores so they re-fetch fresh on next login
    const { usePositionsStore } = await import('../stores/positions')
    const { useTransactionsStore } = await import('../stores/transactions')
    usePositionsStore().reset()
    useTransactionsStore().clear()
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
    localStorage.removeItem('rw_wallet_balance')
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
