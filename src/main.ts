import { supabase, isSupabaseConfigured } from './lib/supabase.js'
import { getProfile, redirectByRole, hasSession } from './lib/auth.js'
import { renderLogin } from './pages/login.js'
import { renderRegister } from './pages/register.js'
import { renderMungesat } from './pages/mungesat.js'
import { renderPronari } from './pages/pronari.js'
import './style.css'

const app = document.getElementById('app')!
function getRoute(): string {
  const hash = window.location.hash.slice(1) || '/'
  return hash.startsWith('/') ? hash : '/' + hash
}

async function render(): Promise<void> {
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

  if (route === '/mungesat') {
    renderMungesat(app)
    return
  }
  if (route === '/pronari') {
    if (profile.role !== 'OWNER') {
      window.location.hash = '#/mungesat'
      return
    }
    renderPronari(app)
    return
  }

  redirectByRole(profile.role)
}

window.addEventListener('hashchange', () => render())
if (isSupabaseConfigured) supabase.auth.onAuthStateChange(() => render())
render()
