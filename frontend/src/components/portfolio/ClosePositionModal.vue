<template>
  <SprModal
    :model-value="modelValue"
    title="Close Position"
    size="sm"
    :static-backdrop="true"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <template #default>
      <p>
        Are you sure you want to close your <strong>{{ ticker }}</strong> position?
        Current value will be credited back to your wallet.
      </p>
    </template>

    <template #footer>
      <SprButton tone="danger" variant="primary" :disabled="closing" @click="handleConfirm">
        {{ closing ? 'Closing...' : 'Close Position' }}
      </SprButton>
      <SprButton tone="neutral" variant="secondary" @click="emit('update:modelValue', false)">
        Cancel
      </SprButton>
    </template>
  </SprModal>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { usePositionsStore } from '../../stores/positions'

const props = defineProps<{
  modelValue: boolean
  positionId: string
  ticker: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  closed: []
}>()

const positions = usePositionsStore()
const closing = ref(false)

async function handleConfirm() {
  closing.value = true
  try {
    await positions.closePosition(props.positionId)
    emit('closed')
    emit('update:modelValue', false)
  } finally {
    closing.value = false
  }
}
</script>
