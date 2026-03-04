import { config } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach } from 'vitest'

// Stub all Sprout Design System components globally so unit tests
// don't require the full DS plugin to be installed.
config.global.stubs = {
  SprTable: true,
  SprButton: true,
  SprCard: true,
  SprInput: true,
  SprBadge: true,
  SprLozenge: true,
  SprModal: true,
  SprTabs: true,
  SprStatus: true,
  SprBanner: true,
  SprSnackbar: true,
  SprSelect: true,
  SprInputCurrency: true,
  SprEmptyState: true,
  SprSidenav: true,
  SprSidenavItem: true,
}

// Reset Pinia state between every test to prevent state leakage.
beforeEach(() => {
  setActivePinia(createPinia())
})
