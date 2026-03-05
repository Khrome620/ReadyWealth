import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '../../stores/auth'
import * as AuthServiceModule from '../../services/AuthService'
import type { AuthUser } from '../../services/AuthService'

// Mock the AuthService so tests don't make real HTTP calls
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

// Mock vue-router useRouter
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

describe('authStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    localStorage.clear()
  })

  // ── setUser / clearUser ───────────────────────────────────────────────────

  it('setUser — stores user and sets isAuthenticated true', () => {
    const store = useAuthStore()
    expect(store.isAuthenticated).toBe(false)

    store.setUser(mockUser)

    expect(store.user).toEqual(mockUser)
    expect(store.isAuthenticated).toBe(true)
  })

  it('clearUser — nulls user and sets isAuthenticated false', () => {
    const store = useAuthStore()
    store.setUser(mockUser)

    store.clearUser()

    expect(store.user).toBeNull()
    expect(store.isAuthenticated).toBe(false)
  })

  it('clearUser — removes localStorage keys', () => {
    localStorage.setItem('rw_wallet_balance', '300000')
    localStorage.setItem('rw_positions', '[]')
    localStorage.setItem('rw_transactions', '[]')
    const store = useAuthStore()
    store.setUser(mockUser)

    store.clearUser()

    expect(localStorage.getItem('rw_wallet_balance')).toBeNull()
    expect(localStorage.getItem('rw_positions')).toBeNull()
    expect(localStorage.getItem('rw_transactions')).toBeNull()
  })

  // ── fetchMe ───────────────────────────────────────────────────────────────

  it('fetchMe — returns true and sets user when service returns a user', async () => {
    vi.mocked(AuthServiceModule.AuthService.fetchMe).mockResolvedValue(mockUser)
    const store = useAuthStore()

    const result = await store.fetchMe()

    expect(result).toBe(true)
    expect(store.user).toEqual(mockUser)
    expect(store.isAuthenticated).toBe(true)
  })

  it('fetchMe — returns false and leaves user null when service returns null', async () => {
    vi.mocked(AuthServiceModule.AuthService.fetchMe).mockResolvedValue(null)
    const store = useAuthStore()

    const result = await store.fetchMe()

    expect(result).toBe(false)
    expect(store.user).toBeNull()
  })

  // ── login ─────────────────────────────────────────────────────────────────

  it('login — calls AuthService.login and sets user', async () => {
    vi.mocked(AuthServiceModule.AuthService.login).mockResolvedValue(mockUser)
    const store = useAuthStore()

    await store.login({ domain: 'test', username: 'jdoe', password: 'pw' })

    expect(AuthServiceModule.AuthService.login).toHaveBeenCalledWith({
      domain: 'test', username: 'jdoe', password: 'pw',
    })
    expect(store.user).toEqual(mockUser)
    expect(store.isAuthenticated).toBe(true)
  })

  it('login — clears localStorage before setting new user', async () => {
    localStorage.setItem('rw_wallet_balance', 'stale')
    vi.mocked(AuthServiceModule.AuthService.login).mockResolvedValue(mockUser)
    const store = useAuthStore()

    await store.login({ domain: 'test', username: 'jdoe', password: 'pw' })

    expect(localStorage.getItem('rw_wallet_balance')).toBeNull()
  })

  it('login — propagates errors from AuthService', async () => {
    vi.mocked(AuthServiceModule.AuthService.login).mockRejectedValue(
      Object.assign(new Error('401'), { response: { status: 401 } })
    )
    const store = useAuthStore()

    await expect(store.login({ domain: 'd', username: 'u', password: 'p' }))
      .rejects.toThrow()
  })

  // ── logout ────────────────────────────────────────────────────────────────

  it('logout — calls AuthService.logout and clears user', async () => {
    vi.mocked(AuthServiceModule.AuthService.logout).mockResolvedValue(undefined)
    const store = useAuthStore()
    store.setUser(mockUser)

    await store.logout()

    expect(AuthServiceModule.AuthService.logout).toHaveBeenCalled()
    expect(store.user).toBeNull()
    expect(store.isAuthenticated).toBe(false)
  })

  it('logout — clears user even when AuthService.logout throws', async () => {
    vi.mocked(AuthServiceModule.AuthService.logout).mockRejectedValue(new Error('network'))
    const store = useAuthStore()
    store.setUser(mockUser)

    await store.logout()

    expect(store.user).toBeNull()
  })
})
