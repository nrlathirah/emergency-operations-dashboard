import { createApp } from 'vue'
import './style.css'
import './styles/design-system.css'
import App from './App.vue'
import { router } from './router'
import { createPinia } from 'pinia'

// Applied synchronously, before Vue/Pinia even initialize, so the very
// first paint already has the right theme — waiting for the theme store
// (created after this point) would show a flash of the wrong theme on
// every load for anyone who picked dark or whose OS prefers it.
const storedTheme = localStorage.getItem('theme') || 'system'
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
document.documentElement.dataset.theme = storedTheme === 'system' ? (prefersDark ? 'dark' : 'light') : storedTheme

createApp(App).use(createPinia()).use(router).mount('#app')
