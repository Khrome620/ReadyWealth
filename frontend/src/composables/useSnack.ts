import { defineStore } from 'pinia'

// Mirror the design-system-next snackbar store by reusing its ID.
// Pinia returns the same cached store instance when the ID matches.
const _useSnackbarStore = defineStore('snackbar-store', () => ({} as {
  updateState: (payload: { text: string; tone?: string; duration?: number }) => void
}))

export function useSnack() {
  const store = _useSnackbarStore()

  function showSuccess(text: string) {
    store.updateState({ text, tone: 'success', duration: 4000 })
  }

  function showDanger(text: string) {
    store.updateState({ text, tone: 'danger', duration: 4000 })
  }

  function showInfo(text: string) {
    store.updateState({ text, tone: 'information', duration: 4000 })
  }

  return { showSuccess, showDanger, showInfo }
}
