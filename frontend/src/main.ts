import { createApp } from 'vue'
import { createPinia } from 'pinia'
import DesignSystem from 'design-system-next'
import 'design-system-next/style.css'
import './index.css'
import App from './App.vue'
import router from './router'
import { setMarketService } from './stores/market'
import { setOrderService } from './stores/wallet'
import { setup401Interceptor } from './services/AuthService'
import { useAuthStore } from './stores/auth'
import { useSnack } from './composables/useSnack'

// Swap in the live API services only when the backend is available.
// Default is mock mode; set VITE_USE_API=true in .env.local to connect to the backend.
if (import.meta.env.VITE_USE_API === 'true') {
  const { ApiMarketService } = await import('./services/ApiMarketService')
  const { ApiOrderService } = await import('./services/ApiOrderService')
  setMarketService(new ApiMarketService())
  setOrderService(new ApiOrderService())
}

const app = createApp(App)
app.use(createPinia())
app.use(DesignSystem)

// The DS registers components as 'spr-sidenav' (kebab) but Vue templates
// resolve <SprSidenav> as 'SprSidenav' (PascalCase). Re-register each
// spr-* component under its PascalCase alias so both names work.
const registered = (app as unknown as { _context: { components: Record<string, object> } })
  ._context.components
for (const [name, comp] of Object.entries(registered)) {
  if (name.startsWith('spr-')) {
    const pascal = 'Spr' + name.slice(4).split('-')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('')
    app.component(pascal, comp as Parameters<typeof app.component>[1])
  }
}

app.use(router)

// Wire up the 401 interceptor: any 401 from the API clears auth and redirects to /login
setup401Interceptor(() => {
  const auth = useAuthStore()
  // Only show toast + redirect if we were actually authenticated (not on initial /me check)
  if (auth.isAuthenticated) {
    try { useSnack().showDanger('Session expired. Please sign in again.') } catch { /* snackbar unavailable */ }
    auth.clearUser()
    router.push({ name: 'login', query: { redirect: router.currentRoute.value.fullPath } })
  } else {
    auth.clearUser()
  }
})

app.mount('#app')
