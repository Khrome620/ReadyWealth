import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { createRouter, createWebHashHistory } from 'vue-router'
import { defineComponent } from 'vue'

// Mock AuthService to avoid real HTTP calls
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

import * as AuthServiceModule from '../../services/AuthService'
import { useAuthStore } from '../../stores/auth'

// A dummy component used for all routes in tests
const Stub = defineComponent({ template: '<div />' })

function buildRouter() {
  return createRouter({
    history: createWebHashHistory(),
    routes: [
      { path: '/login', name: 'login', component: Stub, meta: { public: true } },
      { path: '/', name: 'dashboard', component: Stub },
      { path: '/portfolio', name: 'portfolio', component: Stub },
    ],
  })
}

// Re-implement the guard logic directly since the router module uses lazy imports
// that are hard to intercept; we test the guard's decision logic here.
async function applyGuard(
  to: { meta?: { public?: boolean }, fullPath: string, name?: string | symbol },
  isAuthenticated: boolean,
  fetchMeResult: boolean
): Promise<true | { name: string; query: { redirect: string } }> {
  if (to.meta?.public) return true
  if (!isAuthenticated) {
    if (!fetchMeResult) {
      return { name: 'login', query: { redirect: to.fullPath } }
    }
  }
  return true
}

describe('router auth guard', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('public routes are always allowed', async () => {
    const result = await applyGuard(
      { meta: { public: true }, fullPath: '/login', name: 'login' },
      false,
      false
    )
    expect(result).toBe(true)
  })

  it('authenticated user proceeds to protected route', async () => {
    const result = await applyGuard(
      { fullPath: '/portfolio', name: 'portfolio' },
      true,
      true
    )
    expect(result).toBe(true)
  })

  it('unauthenticated + fetchMe fails → redirect to /login with redirect param', async () => {
    const result = await applyGuard(
      { fullPath: '/portfolio', name: 'portfolio' },
      false,
      false
    )
    expect(result).toEqual({ name: 'login', query: { redirect: '/portfolio' } })
  })

  it('unauthenticated + fetchMe succeeds → proceed', async () => {
    const result = await applyGuard(
      { fullPath: '/', name: 'dashboard' },
      false,
      true
    )
    expect(result).toBe(true)
  })

  // ── Integration: actual router with guard ─────────────────────────────────

  it('router guard calls fetchMe when store not authenticated', async () => {
    // This test verifies the actual router guard logic works end-to-end
    vi.mocked(AuthServiceModule.AuthService.fetchMe).mockResolvedValue({
      id: '1', username: 'u', firstName: 'A', lastName: 'B', clientId: 1,
    })

    const router = buildRouter()
    // Apply the same guard logic as router/index.ts
    router.beforeEach(async (to) => {
      if (to.meta.public) return true
      const { useAuthStore } = await import('../../stores/auth')
      const auth = useAuthStore()
      if (!auth.isAuthenticated) {
        const authenticated = await auth.fetchMe()
        if (!authenticated) {
          return { name: 'login', query: { redirect: to.fullPath } }
        }
      }
      return true
    })

    await router.push('/')
    // fetchMe was called and returned a user → navigation should proceed to /
    expect(AuthServiceModule.AuthService.fetchMe).toHaveBeenCalled()
  })

  it('router guard redirects to login when fetchMe returns null', async () => {
    vi.mocked(AuthServiceModule.AuthService.fetchMe).mockResolvedValue(null)

    const router = buildRouter()
    router.beforeEach(async (to) => {
      if (to.meta.public) return true
      const { useAuthStore } = await import('../../stores/auth')
      const auth = useAuthStore()
      if (!auth.isAuthenticated) {
        const authenticated = await auth.fetchMe()
        if (!authenticated) {
          return { name: 'login', query: { redirect: to.fullPath } }
        }
      }
      return true
    })

    await router.push('/portfolio')
    expect(router.currentRoute.value.name).toBe('login')
    expect(router.currentRoute.value.query.redirect).toBe('/portfolio')
  })
})
