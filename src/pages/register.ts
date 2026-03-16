import { signUp, redirectByRole } from '../lib/auth.js'
import { isSupabaseConfigured } from '../lib/supabase.js'
import type { UserRole } from '../types.js'

const pillSvg = `
  <svg viewBox="0 0 48 100" fill="none" xmlns="http://www.w3.org/2000/svg" class="auth-pill-svg">
    <defs>
      <linearGradient id="pill-shine-2" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="white" stop-opacity="0.25"/><stop offset="100%" stop-color="white" stop-opacity="0"/></linearGradient>
    </defs>
    <path d="M0 24 A24 24 0 0 1 48 24 L48 50 L0 50 Z" fill="#38bdf8"/>
    <path d="M0 50 L48 50 L48 76 A24 24 0 0 1 0 76 Z" fill="#ffffff"/>
    <path d="M0 24 A24 24 0 0 1 48 24 L48 50 L0 50 Z" fill="url(#pill-shine-2)" opacity="0.6"/>
  </svg>
`

export function renderRegister(container: HTMLElement): void {
  const demoBanner = !isSupabaseConfigured
    ? '<div class="auth-demo-banner">Modalitet demo – pa backend.</div>'
    : ''

  container.innerHTML = `
    <div class="auth-hero">
      <div class="auth-hero-left">
        <div class="auth-card">
          <div class="auth-pill-icon" id="auth-pill-wrap">
            ${pillSvg}
          </div>
          <header class="auth-header">
            <h1 class="auth-title">FlowInventory</h1>
            <p class="auth-subtitle">Krijo llogari të re</p>
          </header>
          ${demoBanner}
          <form id="register-form" class="auth-form">
            <div class="auth-field">
              <label for="reg-email" class="auth-label">Email</label>
              <input type="email" id="reg-email" name="email" required placeholder="email@shembull.com" autocomplete="email" class="auth-input" />
            </div>
            <div class="auth-field">
              <label for="reg-password" class="auth-label">Fjalëkalim</label>
              <input type="password" id="reg-password" name="password" required minlength="6" placeholder="••••••••" autocomplete="new-password" class="auth-input" />
            </div>
            <div class="auth-field">
              <label for="reg-role" class="auth-label">Roli</label>
              <select id="reg-role" name="role" required class="auth-input">
                <option value="">Zgjidhni rol</option>
                <option value="WORKER">Punëtori</option>
                <option value="OWNER">Pronari</option>
              </select>
            </div>
            <p id="register-error" class="auth-error" aria-live="polite"></p>
            <button type="submit" id="register-btn" class="auth-primary-button">Regjistrohu</button>
          </form>
          <p class="mt-4 text-center text-sm text-slate-500">
            Ke llogari?
            <button type="button" id="btn-kycu" class="auth-link bg-none border-none cursor-pointer p-0">
              Kyçu
            </button>
          </p>
        </div>
      </div>
      <div class="auth-hero-right">
        <h2 class="auth-hero-title">
          Menaxho <strong>mungesat e barnave</strong><br />që nga regjistrimi i parë
        </h2>
        <p class="auth-hero-text">
          Regjistro llogari për punëtorin dhe pronarin e farmacisë dhe fillo të centralizosh mungesat në një vend të vetëm.
        </p>
        <div class="auth-hero-features">
          <div class="auth-hero-feature">
            <div class="auth-hero-feature-icon">👥</div>
            <div>
              <div class="auth-hero-feature-title">Dy role të thjeshta</div>
              <div class="auth-hero-feature-text">Punëtori shton mungesat, pronari menaxhon porositë.</div>
            </div>
          </div>
          <div class="auth-hero-feature">
            <div class="auth-hero-feature-icon">⚙️</div>
            <div>
              <div class="auth-hero-feature-title">Konfigurim i shpejtë</div>
              <div class="auth-hero-feature-text">Mjafton një llogari për pronarin dhe një për punëtorin.</div>
            </div>
          </div>
          <div class="auth-hero-feature">
            <div class="auth-hero-feature-icon">✅</div>
            <div>
              <div class="auth-hero-feature-title">Gati për demo</div>
              <div class="auth-hero-feature-text">Trego fluksin komplet: nga mungesat deri te porosia.</div>
            </div>
          </div>
        </div>
        <div class="auth-hero-illustration">
          <div class="auth-hero-illustration-text">
            Seksion informues për mënyrën si pronari sheh dhe miraton porositë. Mund të zëvendësohet me ilustrim real më vonë.
          </div>
          <img
            src="/images/pharmacist.jpg"
            alt="Farmacist duke kontrolluar barnat në raft"
            class="w-40 h-24 rounded-xl border border-sky-300/40 object-cover"
          />
        </div>
      </div>
    </div>
  `

  const form = document.getElementById('register-form') as HTMLFormElement
  const errorEl = document.getElementById('register-error')!
  const btn = document.getElementById('register-btn') as HTMLButtonElement
  const pillWrap = document.getElementById('auth-pill-wrap')!
  const btnKycu = document.getElementById('btn-kycu')!

  btnKycu.addEventListener('click', () => {
    pillWrap.classList.add('pill-go')
    setTimeout(() => { window.location.hash = '#/kycu' }, 700)
  })

  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    errorEl.textContent = ''
    btn.disabled = true
    const email = (form.email as HTMLInputElement).value.trim()
    const password = (form.password as HTMLInputElement).value
    const roleEl = form.querySelector('[name="role"]') as HTMLSelectElement | null
    const role = (roleEl?.value ?? '') as UserRole
    try {
      const result = await signUp(email, password, role)
      redirectByRole(result.role)
    } catch (err) {
      errorEl.textContent = (err instanceof Error ? err.message : 'Regjistrimi dështoi.')
      btn.disabled = false
    }
  })
}
