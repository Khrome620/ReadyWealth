import { createApp } from 'vue'
import { createPinia } from 'pinia'
import DesignSystem from 'design-system-next'
import 'design-system-next/style.css'
import './index.css'
import App from './App.vue'
import router from './router'

const app = createApp(App)
app.use(createPinia())
app.use(DesignSystem)
app.use(router)
app.mount('#app')
