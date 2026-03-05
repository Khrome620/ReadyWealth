import axios from 'axios'

export interface AuthUser {
  id: string
  username: string
  firstName: string
  lastName: string
  clientId: number
}

export interface LoginPayload {
  domain: string
  username: string
  password: string
}

export const authApi = axios.create({
  baseURL: '/api/v1/auth',
  withCredentials: true, // required to send/receive HttpOnly cookies
})

// General API instance with 401 interceptor — set up after app is created
export const api = axios.create({ withCredentials: true })

/**
 * Wire up the 401 interceptor. Call this once from main.ts after creating
 * the Pinia instance and router, to avoid circular-dependency issues.
 */
export function setup401Interceptor(onUnauthorized: () => void) {
  api.interceptors.response.use(
    (res) => res,
    (err: { response?: { status?: number } }) => {
      if (err?.response?.status === 401) {
        onUnauthorized()
      }
      return Promise.reject(err)
    }
  )
}

export const AuthService = {
  async login(payload: LoginPayload): Promise<AuthUser> {
    const { data } = await authApi.post<{ user: AuthUser }>('/login', payload)
    return data.user
  },

  async logout(): Promise<void> {
    await authApi.post('/logout')
  },

  async fetchMe(): Promise<AuthUser | null> {
    try {
      const { data } = await authApi.get<{ user: AuthUser }>('/me')
      return data.user
    } catch {
      return null
    }
  },
}
