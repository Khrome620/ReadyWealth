<template>
  <div class="rw-page">
    <h2 class="rw-view-title">Transaction History</h2>
    <TransactionsTable />
  </div>
</template>

<script setup lang="ts">
import TransactionsTable from '../components/transactions/TransactionsTable.vue'
</script>

<style scoped>
.rw-view-title {
  font-size: 1.25rem;
  font-weight: 700;
  margin: 0 0 1rem;
}
</style>
