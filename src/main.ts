import { supabase, isSupabaseConfigured } from './lib/supabase.js'
import {
  getProfile,
  redirectByRole,
  hasSession,
  finalizeOAuthProfileIfNeeded,
  ensureCurrentSessionIsActive,
  isPasswordRecoveryPending,
  clearPasswordRecoveryPending,
  setPasswordRecoveryPending,
  syncPasswordRecoveryFromUrl,
} from './lib/auth.js'
import { applyStoredTheme, bindThemeToggleButtons } from './lib/theme.js'
import './style.css'

const app = document.getElementById('app')!
const SESSION_GUARD_INTERVAL_MS = 120000
const FOREGROUND_RECHECK_MS = 45000
let loginPageModulePromise: Promise<typeof import('./pages/login.js')> | null = null
let workerPageModulePromise: Promise<typeof import('./pages/mungesat.js')> | null = null
let ownerPageModulePromise: Promise<typeof import('./pages/pronari.js')> | null = null

async function renderLoginPage(container: HTMLElement): Promise<void> {
  loginPageModulePromise ??= import('./pages/login.js')
  const { renderLogin } = await loginPageModulePromise
  renderLogin(container)
}

async function renderWorkerPage(container: HTMLElement): Promise<void> {
  workerPageModulePromise ??= import('./pages/mungesat.js')
  const { renderMungesat } = await workerPageModulePromise
  renderMungesat(container, 'mungesat')
}

async function renderOwnerPage(
  container: HTMLElement,
  section: 'dashboard' | 'mungesat' | 'porosite' | 'import' | 'settings' | 'profile' | 'kompania' | 'ekipa',
  role: 'OWNER' | 'MANAGER' | 'WORKER'
): Promise<void> {
  ownerPageModulePromise ??= import('./pages/pronari.js')
  const { renderPronari } = await ownerPageModulePromise
  renderPronari(container, section, role)
}

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

function getOwnerSection(route: string): 'dashboard' | 'mungesat' | 'porosite' | 'import' | 'settings' | 'profile' | 'kompania' | 'ekipa' {
  if (route === '/pronari' || route === '/dashboard' || route.startsWith('/pronari/dashboard')) return 'dashboard'
  if (route === '/mungesat-pronari' || route.startsWith('/pronari/mungesat')) return 'mungesat'
  if (route === '/porosite' || route.startsWith('/pronari/porosite')) return 'porosite'
  if (route === '/import' || route.startsWith('/pronari/import')) return 'import'
  if (route === '/settings' || route.startsWith('/pronari/settings')) return 'settings'
  if (route === '/profile' || route.startsWith('/pronari/profile')) return 'profile'
  if (route === '/kompania' || route.startsWith('/pronari/kompania')) return 'kompania'
  if (route === '/ekipa' || route.startsWith('/pronari/ekipa')) return 'ekipa'
  return 'dashboard'
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

  if (route === '/regjistrohu') {
    window.location.hash = '#/kycu'
    return
  }

  if (route === '/kycu') {
    const hasUserSession = await hasSession()
    const recoveryMode = isPasswordRecoveryPending() && route === '/kycu' && hasUserSession
    if (isPasswordRecoveryPending() && route === '/kycu' && !hasUserSession) {
      clearPasswordRecoveryPending()
    }
    if (!recoveryMode && hasUserSession) {
      const sessionAllowed = await ensureCurrentSessionIsActive()
      if (!sessionAllowed) {
        await renderLoginPage(app)
        bindThemeToggleButtons(document)
        return
      }
      let profile = await getProfile()
      if (!profile) {
        profile = await finalizeOAuthProfileIfNeeded()
      }
      if (profile) {
        redirectByRole(profile.role)
        return
      }
    }
    await renderLoginPage(app)
    bindThemeToggleButtons(document)
    return
  }

  if (!(await hasSession())) {
    window.location.hash = '#/kycu'
    return
  }

  const sessionAllowed = await ensureCurrentSessionIsActive()
  if (!sessionAllowed) return

  const profile = await getProfile()
  if (!profile) {
    window.location.hash = '#/kycu'
    return
  }

  if (route === '/mungesat' || route.startsWith('/mungesat/')) {
    await renderWorkerPage(app)
    bindThemeToggleButtons(document)
    return
  }
  if (
    route === '/pronari' ||
    route.startsWith('/pronari/') ||
    route === '/porosite' ||
    route === '/import' ||
    route === '/settings' ||
    route === '/profile' ||
    route === '/kompania' ||
    route === '/ekipa'
  ) {
    const role = String(profile.role)
    if (role !== 'OWNER' && role !== 'MANAGER') {
      window.location.hash = '#/mungesat'
      return
    }
    const section = getOwnerSection(route)
    if ((section === 'settings' || section === 'kompania' || section === 'import' || section === 'ekipa') && role !== 'OWNER') {
      window.location.hash = '#/pronari'
      return
    }
    await renderOwnerPage(app, section, role === 'OWNER' ? 'OWNER' : role === 'MANAGER' ? 'MANAGER' : 'WORKER')
    bindThemeToggleButtons(document)
    return
  }

  redirectByRole(profile.role)
}

function renderWithGuard(): void {
  lastRenderAtMs = Date.now()
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

let lastRenderAtMs = 0

function renderIfStale(): void {
  const now = Date.now()
  if (now - lastRenderAtMs < FOREGROUND_RECHECK_MS) return
  renderWithGuard()
}

disableLocalServiceWorkerCache()
  .catch((err) => console.warn('Local SW cleanup failed:', err))
  .finally(() => {
    window.addEventListener('hashchange', () => renderWithGuard())
    window.addEventListener('focus', () => renderIfStale())
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) renderIfStale()
    })
    if (isSupabaseConfigured) {
      supabase.auth.onAuthStateChange((event) => {
        if (event === 'PASSWORD_RECOVERY') {
          setPasswordRecoveryPending()
          if (window.location.hash !== '#/kycu') window.location.hash = '#/kycu'
        }
        renderWithGuard()
      })
      window.setInterval(() => {
        if (!document.hidden) renderWithGuard()
      }, SESSION_GUARD_INTERVAL_MS)
    }
    renderWithGuard()
  })
