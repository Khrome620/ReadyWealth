<template>
  <SprSidenav :nav-links="navLinks" :active-nav="activeNav" @get-navlink-item="handleNav">
    <template #logo-image>
      <div class="rw-logo-wrap">
        <img src="/images/sproutsolutionshr_11109_logo_1605164231_krvtu.avif" alt="Sprout Solutions" class="rw-logo-img" />
      </div>
    </template>
  </SprSidenav>

  <main class="rw-main">
    <header class="rw-topbar">
      <!-- Decorative chart lines in background -->
      <svg class="rw-topbar-chart-bg" viewBox="0 0 400 120" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <polyline points="0,90 40,75 80,85 120,55 160,60 200,40 240,50 280,25 320,30 360,10 400,15"
          stroke="rgba(255,255,255,0.12)" stroke-width="2.5" fill="none"/>
        <polyline points="0,100 40,95 80,105 120,80 160,85 200,65 240,75 280,50 320,60 360,35 400,40"
          stroke="rgba(255,255,255,0.07)" stroke-width="2" fill="none"/>
        <polyline points="0,110 50,100 100,108 150,90 200,88 250,72 300,78 350,55 400,58"
          stroke="rgba(255,255,255,0.05)" stroke-width="1.5" fill="none"/>
      </svg>

      <div class="rw-topbar-left">
        <div class="rw-topbar-logo">
          <img src="/images/imgbin-logo-brand-business-human-resource-sprout-solutions-philippines-inc-business-sp9kHLn9r4Gq89uaLVajw8A8L.jpg" alt="ReadyWealth" class="rw-topbar-logo-img" />
          <span class="rw-topbar-name">ReadyWealth</span>
        </div>
        <p class="rw-topbar-tagline">Your PSE paper-trading dashboard</p>
      </div>

      <div class="rw-topbar-right">
        <div class="rw-powered-by">
          <span class="rw-powered-label">Powered by</span>
          <div class="rw-sprout-brand">
            <img src="/images/sproutsolutionshr_11109_logo_1605164231_krvtu.avif" alt="Sprout Solutions" class="rw-sprout-logo-img" />
            <span class="rw-sprout-name">sprout solutions</span>
          </div>
        </div>
      </div>
    </header>
    <RouterView />
  </main>

  <SprSnackbar />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const navLinks = computed(() => ({
  top: [
    {
      parentLinks: [
        { title: 'Dashboard',    icon: 'ph:house',        redirect: { openInNewTab: false, isAbsoluteURL: false, link: '/' },             menuLinks: [] },
        { title: 'Portfolio',    icon: 'ph:chart-pie',    redirect: { openInNewTab: false, isAbsoluteURL: false, link: '/portfolio' },    menuLinks: [] },
        { title: 'Transactions', icon: 'ph:list-bullets', redirect: { openInNewTab: false, isAbsoluteURL: false, link: '/transactions' }, menuLinks: [] },
      ],
    },
  ],
  bottom: [],
}))

const activeNav = computed(() => ({
  parentNav: route.path === '/'
    ? 'Dashboard'
    : route.path === '/portfolio' ? 'Portfolio' : 'Transactions',
  menu: '',
  submenu: '',
}))

function handleNav(item: { link?: string; redirect?: { link: string } }) {
  const path = item.redirect?.link ?? item.link
  if (path) router.push(path)
}
</script>

<style>
/* ── Sidenav logo ── */
.rw-logo-wrap {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0 0.25rem;
}

.rw-logo-img {
  height: 32px;
  width: auto;
  object-fit: contain;
  flex-shrink: 0;
}

/* ── Layout ── */
.rw-main {
  margin-left: 64px;
  min-height: 100vh;
  background: #f8fafc;
  transition: margin-left 0.2s;
}

/* ── Topbar ── */
.rw-topbar {
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: linear-gradient(135deg, #16a34a 0%, #15803d 60%, #166534 100%);
  padding: 1.75rem 2.5rem 1.5rem;
  border-bottom: 1px solid rgba(255,255,255,0.1);
  box-shadow: 0 2px 12px rgba(22, 163, 74, 0.25);
}

.rw-topbar-chart-bg {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 55%;
  height: 100%;
  pointer-events: none;
}

.rw-topbar-left {
  position: relative;
  z-index: 1;
}

.rw-topbar-logo {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin-bottom: 0.3rem;
}

.rw-topbar-logo-img {
  height: 48px;
  width: auto;
  object-fit: contain;
  border-radius: 6px;
  flex-shrink: 0;
}

.rw-topbar-name {
  font-size: 2.25rem;
  font-weight: 800;
  color: #ffffff;
  letter-spacing: -0.03em;
  line-height: 1;
  text-shadow: 0 2px 4px rgba(0,0,0,0.15);
}

.rw-topbar-tagline {
  margin: 0;
  font-size: 0.875rem;
  color: rgba(255,255,255,0.7);
  letter-spacing: 0.01em;
}

/* ── Powered by Sprout ── */
.rw-topbar-right {
  position: relative;
  z-index: 1;
  flex-shrink: 0;
}

.rw-powered-by {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.4rem;
}

.rw-powered-label {
  font-size: 0.7rem;
  color: rgba(255,255,255,0.55);
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.rw-sprout-brand {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(255,255,255,0.12);
  border: 1px solid rgba(255,255,255,0.2);
  border-radius: 999px;
  padding: 0.3rem 0.75rem 0.3rem 0.3rem;
  backdrop-filter: blur(4px);
}

.rw-sprout-logo-img {
  height: 28px;
  width: 28px;
  object-fit: contain;
  border-radius: 50%;
  background: white;
  padding: 2px;
  flex-shrink: 0;
}

.rw-sprout-name {
  font-size: 0.8rem;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: 0.02em;
}

/* ── Responsive ── */
@media (max-width: 767px) {
  .rw-main {
    margin-left: 0;
    padding-bottom: 64px;
  }

  .rw-topbar {
    padding: 1.25rem 1.25rem 1rem;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }

  .rw-topbar-name {
    font-size: 1.75rem;
  }

  .rw-topbar-logo-img {
    height: 36px;
  }

  .rw-topbar-right {
    align-self: flex-start;
  }

  .rw-powered-by {
    align-items: flex-start;
  }

  .rw-topbar-chart-bg {
    width: 100%;
    opacity: 0.5;
  }
}
</style>
