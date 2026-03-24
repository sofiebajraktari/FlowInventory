import { supabase, isSupabaseConfigured } from './lib/supabase.js'
import {
  getProfile,
  redirectByRole,
  hasSession,
  finalizeOAuthProfileIfNeeded,
  isPasswordRecoveryPending,
  clearPasswordRecoveryPending,
  setPasswordRecoveryPending,
  syncPasswordRecoveryFromUrl,
} from './lib/auth.js'
import { renderLogin } from './pages/login.js'
import { renderRegister } from './pages/register.js'
import { renderMungesat } from './pages/mungesat.js'
import { renderPronari } from './pages/pronari.js'
import { applyStoredTheme, bindThemeToggleButtons } from './lib/theme.js'
import './style.css'

const app = document.getElementById('app')!

async function disableLocalServiceWorkerCache(): Promise<void> {
  const isLocalhost =
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname === '::1'
  if (!isLocalhost) return

  if ('serviceWorker' in navigator) {
    const regs = await navigator.serviceWorker.getRegistrations()
    await Promise.all(regs.map((reg) => reg.unregister()))
  }

  if ('caches' in window) {
    const keys = await caches.keys()
    await Promise.all(keys.map((key) => caches.delete(key)))
  }
}
function getRoute(): string {
  const hash = window.location.hash.slice(1) || '/'
  return hash.startsWith('/') ? hash : '/' + hash
}

function getOwnerSection(route: string): 'mungesat' | 'porosite' | 'import' {
  if (route === '/porosite' || route.startsWith('/pronari/porosite')) return 'porosite'
  if (route === '/import' || route.startsWith('/pronari/import')) return 'import'
  return 'mungesat'
}

async function render(): Promise<void> {
  applyStoredTheme()
  syncPasswordRecoveryFromUrl()
  const route = getRoute()
  if (isPasswordRecoveryPending() && route !== '/kycu') {
    window.location.hash = '#/kycu'
    return
  }
  if (!isSupabaseConfigured) {
    app.innerHTML = `
      <div class="min-h-[calc(100vh-2rem)] flex items-center justify-center p-4">
        <div class="w-full max-w-lg rounded-2xl border border-rose-200 bg-rose-50 p-6 shadow-sm">
          <h1 class="text-lg font-semibold text-rose-900">Supabase nuk është konfiguruar</h1>
          <p class="mt-2 text-sm text-rose-800">
            Për ta përdorur aplikacionin, vendos variablat <code>VITE_SUPABASE_URL</code> dhe
            <code>VITE_SUPABASE_ANON_KEY</code> në <code>.env</code>, pastaj rifillo app-in.
          </p>
        </div>
      </div>
    `
    return
  }

  if (route === '/kycu' || route === '/regjistrohu') {
    const hasUserSession = await hasSession()
    const recoveryMode = isPasswordRecoveryPending() && route === '/kycu' && hasUserSession
    if (isPasswordRecoveryPending() && route === '/kycu' && !hasUserSession) {
      clearPasswordRecoveryPending()
    }
    if (!recoveryMode && hasUserSession) {
      let profile = await getProfile()
      if (!profile) {
        profile = await finalizeOAuthProfileIfNeeded()
      }
      if (profile) {
        redirectByRole(profile.role)
        return
      }
    }
    if (route === '/kycu') renderLogin(app)
    else renderRegister(app)
    bindThemeToggleButtons(document)
    return
  }

  if (!(await hasSession())) {
    window.location.hash = '#/kycu'
    return
  }

  const profile = await getProfile()
  if (!profile) {
    window.location.hash = '#/kycu'
    return
  }

  if (route === '/mungesat' || route.startsWith('/mungesat/')) {
    renderMungesat(app, 'mungesat')
    bindThemeToggleButtons(document)
    return
  }
  if (route === '/pronari' || route.startsWith('/pronari/') || route === '/porosite' || route === '/import') {
    if (profile.role !== 'OWNER') {
      window.location.hash = '#/mungesat'
      return
    }
    const section = getOwnerSection(route)
    renderPronari(app, section)
    bindThemeToggleButtons(document)
    return
  }

  redirectByRole(profile.role)
}

function renderWithGuard(): void {
  render().catch((error: unknown) => {
    console.error('Render error:', error)
    const message = error instanceof Error ? error.message : 'Gabim i panjohur gjatë ngarkimit.'
    app.innerHTML = `
      <div class="min-h-[calc(100vh-2rem)] flex items-center justify-center p-4">
        <div class="w-full max-w-lg rounded-2xl border border-rose-200 bg-rose-50 p-6 shadow-sm">
          <h1 class="text-lg font-semibold text-rose-900">Gabim gjatë ngarkimit</h1>
          <p class="mt-2 text-sm text-rose-800">${message}</p>
          <p class="mt-2 text-xs text-rose-700">
            Kontrollo <code>.env</code> dhe rifillo serverin me <code>npm run dev</code>.
          </p>
        </div>
      </div>
    `
  })
}

disableLocalServiceWorkerCache()
  .catch((err) => console.warn('Local SW cleanup failed:', err))
  .finally(() => {
    window.addEventListener('hashchange', () => renderWithGuard())
    if (isSupabaseConfigured) {
      supabase.auth.onAuthStateChange((event) => {
        if (event === 'PASSWORD_RECOVERY') {
          setPasswordRecoveryPending()
          if (window.location.hash !== '#/kycu') window.location.hash = '#/kycu'
        }
        renderWithGuard()
      })
    }
    renderWithGuard()
  })
