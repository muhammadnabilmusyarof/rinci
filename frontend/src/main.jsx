import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { registerSW } from 'virtual:pwa-register'

// Register Service Worker dengan auto-update
const updateSW = registerSW({
  onNeedRefresh() {
    // Tampilkan notifikasi update tersedia
    if (confirm('Versi baru Rinci tersedia. Perbarui sekarang?')) {
      updateSW(true)
    }
  },
  onOfflineReady() {
    console.log('✅ Rinci siap digunakan offline!')
  },
  onRegistered(r) {
    console.log('✅ Service Worker terdaftar:', r)
  },
  onRegisterError(error) {
    console.error('❌ Service Worker gagal:', error)
  },
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
