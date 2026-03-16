import { supabase, isSupabaseConfigured } from './lib/supabase.js'
import { getProfile, redirectByRole, hasSession } from './lib/auth.js'
import { renderLogin } from './pages/login.js'
import { renderRegister } from './pages/register.js'
import { renderMungesat } from './pages/mungesat.js'
import { renderPronari } from './pages/pronari.js'
import { applyStoredTheme, bindThemeToggleButtons } from './lib/theme.js'
import './style.css'

const app = document.getElementById('app')!
const THEME_TOGGLE_ID = 'theme-toggle-floating'

function routeSection(route: string): string | null {
  const parts = route.split('/').filter(Boolean)
  return parts.length >= 2 ? parts[1] : null
}
function getRoute(): string {
  const hash = window.location.hash.slice(1) || '/'
  return hash.startsWith('/') ? hash : '/' + hash
}

async function render(): Promise<void> {
  applyStoredTheme()
  const route = getRoute()

  if (route === '/kycu' || route === '/regjistrohu') {
    if (await hasSession()) {
      const profile = await getProfile()
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
    const section = routeSection(route) ?? 'mungesat'
    renderMungesat(app, section)
    bindThemeToggleButtons(document)
    return
  }
  if (route === '/pronari' || route.startsWith('/pronari/')) {
    if (profile.role !== 'OWNER') {
      window.location.hash = '#/mungesat'
      return
    }
    const section = routeSection(route) ?? 'dashboard'
    renderPronari(app, section)
    bindThemeToggleButtons(document)
    return
  }

  redirectByRole(profile.role)
}

function ensureThemeToggle(): void {
  let btn = document.getElementById(THEME_TOGGLE_ID) as HTMLButtonElement | null
  if (!btn) {
    btn = document.createElement('button')
    btn.id = THEME_TOGGLE_ID
    btn.className =
      'theme-toggle-chip fixed bottom-4 left-4 z-50 rounded-full px-3 py-2 text-xs font-semibold shadow-lg'
    btn.setAttribute('data-theme-toggle', '1')
    document.body.appendChild(btn)
  }
  bindThemeToggleButtons(document)
}

window.addEventListener('hashchange', () => render())
if (isSupabaseConfigured) supabase.auth.onAuthStateChange(() => render())
ensureThemeToggle()
render()
