<template>
  <div class="rw-page">
    <h2 class="rw-view-title">Portfolio</h2>
    <PortfolioTable />
  </div>
</template>

<script setup lang="ts">
import PortfolioTable from '../components/portfolio/PortfolioTable.vue'
</script>

<style scoped>
.rw-view-title {
  font-size: 1.25rem;
  font-weight: 700;
  margin: 0 0 1rem;
}
</style>
