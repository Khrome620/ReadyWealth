<template>
  <div class="rw-login-page">
    <!-- Animated background blobs -->
    <div class="rw-blob rw-blob-1" />
    <div class="rw-blob rw-blob-2" />
    <div class="rw-blob rw-blob-3" />

    <div class="rw-login-card">
      <!-- Brand -->
      <div class="rw-login-brand">
        <div class="rw-login-logo-wrap">
          <img src="/images/sproutsolutionshr_11109_logo_1605164231_krvtu.avif" alt="Sprout" class="rw-login-logo__img" />
        </div>
        <span class="rw-login-brand-name">ReadyWealth</span>
        <span class="rw-login-brand-tag">by Sprout Solutions</span>
      </div>

      <div class="rw-login-divider" />

      <h1 class="rw-login-title">Welcome back 👋</h1>
      <p class="rw-login-subtitle">Sign in with your Sprout HR credentials to continue</p>

      <form class="rw-login-form" @submit.prevent="handleSubmit">
        <div class="rw-field">
          <SprInput
            v-model="form.domain"
            label="Domain"
            placeholder="e.g. nebula-fullsync.hrtest.ph"
            :disabled="loading"
            :error="fieldErrors.domain"
          />
        </div>
        <div class="rw-field">
          <SprInput
            v-model="form.username"
            label="Username"
            placeholder="your.username"
            :disabled="loading"
            :error="fieldErrors.username"
          />
        </div>
        <div class="rw-field">
          <SprInput
            v-model="form.password"
            label="Password"
            type="password"
            placeholder="••••••••"
            :disabled="loading"
            :error="fieldErrors.password"
          />
        </div>

        <div v-if="generalError" class="rw-login-error">
          <span class="rw-login-error-icon">⚠️</span>
          {{ generalError }}
        </div>

        <button
          type="submit"
          class="rw-login-submit"
          :class="{ 'rw-login-submit--loading': loading }"
          :disabled="loading"
        >
          <span v-if="loading" class="rw-spinner" />
          <span>{{ loading ? 'Signing in…' : 'Sign in' }}</span>
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const form = reactive({ domain: '', username: '', password: '' })
const loading = ref(false)
const generalError = ref<string | null>(null)
const fieldErrors = reactive({ domain: '', username: '', password: '' })

async function handleSubmit() {
  generalError.value = null
  fieldErrors.domain = ''
  fieldErrors.username = ''
  fieldErrors.password = ''

  if (!form.domain) { fieldErrors.domain = 'Domain is required.'; return }
  if (!form.username) { fieldErrors.username = 'Username is required.'; return }
  if (!form.password) { fieldErrors.password = 'Password is required.'; return }

  loading.value = true
  try {
    await authStore.login({ domain: form.domain, username: form.username, password: form.password })
    const raw = typeof route.query.redirect === 'string' ? route.query.redirect : '/'
    const redirect = raw.startsWith('/') && !raw.startsWith('//') ? raw : '/'
    router.push(redirect)
  } catch (err: unknown) {
    const status = (err as { response?: { status?: number } })?.response?.status
    if (status === 401) {
      generalError.value = 'The username or password is incorrect.'
    } else if (status === 503) {
      generalError.value = 'Authentication service is temporarily unavailable. Please try again shortly.'
    } else if (status === 400) {
      generalError.value = 'Domain, username, and password are all required.'
    } else {
      generalError.value = 'An unexpected error occurred. Please try again.'
    }
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
/* ── Page ── */
.rw-login-page {
  width: 100%;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #064e3b 100%);
  padding: 1rem;
  position: relative;
  overflow: hidden;
}

/* ── Animated background blobs ── */
.rw-blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.25;
  animation: blobFloat 8s ease-in-out infinite alternate;
}
.rw-blob-1 {
  width: 500px; height: 500px;
  background: #16a34a;
  top: -120px; left: -100px;
  animation-duration: 9s;
}
.rw-blob-2 {
  width: 400px; height: 400px;
  background: #2563eb;
  bottom: -80px; right: -80px;
  animation-duration: 11s;
  animation-delay: -3s;
}
.rw-blob-3 {
  width: 300px; height: 300px;
  background: #7c3aed;
  top: 40%; left: 55%;
  animation-duration: 7s;
  animation-delay: -6s;
}
@keyframes blobFloat {
  from { transform: translate(0, 0) scale(1); }
  to   { transform: translate(30px, -40px) scale(1.08); }
}

/* ── Card ── */
.rw-login-card {
  position: relative;
  z-index: 1;
  background: rgba(255, 255, 255, 0.07);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 20px;
  box-shadow: 0 25px 60px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255,255,255,0.05) inset;
  padding: 2.75rem 2.25rem;
  width: 100%;
  max-width: 420px;
}

/* ── Brand ── */
.rw-login-brand {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.6rem;
  margin-bottom: 1.75rem;
  text-align: center;
}
.rw-login-logo-wrap {
  width: 80px;
  height: 80px;
  border-radius: 22px;
  background: rgba(255,255,255,0.12);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border: 1px solid rgba(255,255,255,0.2);
  box-shadow: 0 8px 24px rgba(0,0,0,0.25);
}
.rw-login-logo__img {
  height: 52px;
  width: auto;
}
.rw-login-brand-name {
  font-size: 2rem;
  font-weight: 900;
  color: #fff;
  letter-spacing: -0.03em;
  line-height: 1.1;
}
.rw-login-brand-tag {
  font-size: 0.78rem;
  color: rgba(255,255,255,0.5);
  font-weight: 500;
  letter-spacing: 0.04em;
}

/* ── Divider ── */
.rw-login-divider {
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent);
  margin-bottom: 1.5rem;
}

/* ── Title ── */
.rw-login-title {
  font-size: 1.6rem;
  font-weight: 800;
  margin: 0 0 0.35rem;
  color: #fff;
  letter-spacing: -0.02em;
}
.rw-login-subtitle {
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.55);
  margin: 0 0 1.75rem;
}

/* ── Form ── */
.rw-login-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* Force SprInput labels and helper text to be visible on dark background */
.rw-field :deep(label),
.rw-field :deep(.spr-input__label),
.rw-field :deep(.spr-label) {
  color: rgba(255, 255, 255, 0.85) !important;
}
.rw-field :deep(input),
.rw-field :deep(.spr-input__field) {
  background: rgba(255, 255, 255, 0.1) !important;
  border-color: rgba(255, 255, 255, 0.2) !important;
  color: #fff !important;
}
.rw-field :deep(input::placeholder) {
  color: rgba(255, 255, 255, 0.35) !important;
}
.rw-field :deep(input:focus),
.rw-field :deep(.spr-input__field:focus) {
  border-color: #16a34a !important;
  background: rgba(255, 255, 255, 0.15) !important;
  outline: none !important;
  box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.3) !important;
}

/* ── Error ── */
.rw-login-error {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #fca5a5;
  font-size: 0.875rem;
  padding: 0.75rem 1rem;
  background: rgba(220, 38, 38, 0.15);
  border: 1px solid rgba(220, 38, 38, 0.3);
  border-radius: 10px;
}
.rw-login-error-icon {
  font-size: 1rem;
  flex-shrink: 0;
}

/* ── Submit button ── */
.rw-login-submit {
  margin-top: 0.25rem;
  width: 100%;
  padding: 0.85rem 1rem;
  border-radius: 12px;
  border: none;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: 0.01em;
  background: linear-gradient(135deg, #16a34a 0%, #15803d 100%);
  color: #fff;
  box-shadow: 0 4px 20px rgba(22, 163, 74, 0.4);
  transition: transform 0.15s, box-shadow 0.15s, opacity 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}
.rw-login-submit:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 28px rgba(22, 163, 74, 0.55);
}
.rw-login-submit:active:not(:disabled) {
  transform: translateY(0);
}
.rw-login-submit:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

/* ── Spinner ── */
.rw-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255,255,255,0.35);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  flex-shrink: 0;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
