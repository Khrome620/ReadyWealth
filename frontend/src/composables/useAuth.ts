import { useAuthStore } from '../stores/auth'
import type { LoginPayload } from '../services/AuthService'

export function useAuth() {
  const authStore = useAuthStore()
  return {
    user: authStore.user,
    isAuthenticated: authStore.isAuthenticated,
    login: (payload: LoginPayload) => authStore.login(payload),
    logout: () => authStore.logout(),
  }
}
