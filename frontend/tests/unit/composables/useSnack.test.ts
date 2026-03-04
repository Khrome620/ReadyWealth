import { describe, it, expect, vi, beforeEach } from 'vitest'
import { defineStore, setActivePinia, createPinia } from 'pinia'
import { useSnack } from '../../../src/composables/useSnack'

describe('useSnack', () => {
  let updateStateSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    setActivePinia(createPinia())
    updateStateSpy = vi.fn()

    // Pre-register the 'snackbar-store' with our spy BEFORE useSnack() creates it.
    // Pinia caches stores by ID: since we call useSnackbarStore() first, the spy
    // implementation is the one that gets stored. Subsequent _useSnackbarStore()
    // calls inside useSnack() return the same already-created instance.
    const useSnackbarStore = defineStore('snackbar-store', () => ({
      updateState: updateStateSpy,
    }))
    useSnackbarStore()
  })

  it('showSuccess calls updateState with success tone and 4 s duration', () => {
    const { showSuccess } = useSnack()
    showSuccess('Trade executed successfully')
    expect(updateStateSpy).toHaveBeenCalledWith({
      text: 'Trade executed successfully',
      tone: 'success',
      duration: 4000,
    })
  })

  it('showDanger calls updateState with danger tone and 4 s duration', () => {
    const { showDanger } = useSnack()
    showDanger('Insufficient funds')
    expect(updateStateSpy).toHaveBeenCalledWith({
      text: 'Insufficient funds',
      tone: 'danger',
      duration: 4000,
    })
  })

  it('showInfo calls updateState with information tone and 4 s duration', () => {
    const { showInfo } = useSnack()
    showInfo('Market data refreshed')
    expect(updateStateSpy).toHaveBeenCalledWith({
      text: 'Market data refreshed',
      tone: 'information',
      duration: 4000,
    })
  })

  it('each call passes through its own message independently', () => {
    const { showSuccess, showDanger } = useSnack()
    showSuccess('first')
    showDanger('second')
    expect(updateStateSpy).toHaveBeenCalledTimes(2)
    expect(updateStateSpy).toHaveBeenNthCalledWith(1, expect.objectContaining({ text: 'first', tone: 'success' }))
    expect(updateStateSpy).toHaveBeenNthCalledWith(2, expect.objectContaining({ text: 'second', tone: 'danger' }))
  })
})
