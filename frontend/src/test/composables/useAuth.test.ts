import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuth } from '../../composables/useAuth'
import { useAuthStore } from '../../stores/auth'
import type { AuthUser } from '../../services/AuthService'

vi.mock('../../services/AuthService', () => ({
  AuthService: {
    login: vi.fn(),
    logout: vi.fn(),
    fetchMe: vi.fn(),
  },
  authApi: { post: vi.fn(), get: vi.fn() },
  api: { interceptors: { response: { use: vi.fn() } } },
  setup401Interceptor: vi.fn(),
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

const mockUser: AuthUser = {
  id: '42',
  username: 'jdoe',
  firstName: 'John',
  lastName: 'Doe',
  clientId: 7,
}

describe('useAuth composable', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('user is null and isAuthenticated is false initially', () => {
    const { user, isAuthenticated } = useAuth()
    expect(user).toBeNull()
    expect(isAuthenticated).toBe(false)
  })

  it('user and isAuthenticated reflect authStore state after setUser', () => {
    const store = useAuthStore()
    store.setUser(mockUser)

    // Create composable after store has been updated
    const { user, isAuthenticated } = useAuth()
    expect(user).toEqual(mockUser)
    expect(isAuthenticated).toBe(true)
  })

  it('login delegates to authStore.login', async () => {
    const store = useAuthStore()
    const loginSpy = vi.spyOn(store, 'login').mockResolvedValue(undefined)
    const { login } = useAuth()

    await login({ domain: 'test', username: 'jdoe', password: 'pw' })

    expect(loginSpy).toHaveBeenCalledWith({ domain: 'test', username: 'jdoe', password: 'pw' })
  })

  it('logout delegates to authStore.logout', async () => {
    const store = useAuthStore()
    const logoutSpy = vi.spyOn(store, 'logout').mockResolvedValue(undefined)
    const { logout } = useAuth()

    await logout()

    expect(logoutSpy).toHaveBeenCalled()
  })
})
