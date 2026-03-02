<template>
  <SprSidenav :nav-links="navLinks" :active-nav="activeNav" @get-navlink-item="handleNav">
    <template #logo-image>
      <span class="rw-logo">ReadyWealth</span>
    </template>
  </SprSidenav>

  <main class="rw-main">
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
        { title: 'Dashboard',    icon: 'ph:house',        link: '/',             menuLinks: [] },
        { title: 'Portfolio',    icon: 'ph:chart-pie',    link: '/portfolio',    menuLinks: [] },
        { title: 'Transactions', icon: 'ph:list-bullets', link: '/transactions', menuLinks: [] },
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

function handleNav(item: { link?: string }) {
  if (item.link) router.push(item.link)
}
</script>

<style>
.rw-logo {
  font-weight: 700;
  font-size: 1.125rem;
  color: #1a56db;
  padding: 0 0.5rem;
}

.rw-main {
  margin-left: 64px;
  min-height: 100vh;
  background: #f8fafc;
  transition: margin-left 0.2s;
}

@media (max-width: 767px) {
  .rw-main {
    margin-left: 0;
    padding-bottom: 64px;
  }
}
</style>
