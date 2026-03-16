import { signIn, redirectByRole } from '../lib/auth.js'
import { isSupabaseConfigured } from '../lib/supabase.js'

const pillSvg = `
  <svg viewBox="0 0 48 100" fill="none" xmlns="http://www.w3.org/2000/svg" class="auth-pill-svg">
    <defs>
      <linearGradient id="pill-shine-1" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="white" stop-opacity="0.25"/><stop offset="100%" stop-color="white" stop-opacity="0"/></linearGradient>
    </defs>
    <path d="M0 24 A24 24 0 0 1 48 24 L48 50 L0 50 Z" fill="#38bdf8"/>
    <path d="M0 50 L48 50 L48 76 A24 24 0 0 1 0 76 Z" fill="#ffffff"/>
    <path d="M0 24 A24 24 0 0 1 48 24 L48 50 L0 50 Z" fill="url(#pill-shine-1)" opacity="0.6"/>
  </svg>
`

export function renderLogin(container: HTMLElement): void {
  const demoBanner = !isSupabaseConfigured
    ? `
      <div class="auth-demo-banner">
        <strong>Demo</strong> – zgjidhni rol, çfarëdo email/fjalëkalim.
      </div>
      <div class="auth-field">
        <label for="demo-role" class="auth-label">Roli (demo)</label>
        <select id="demo-role" name="demo-role" class="auth-input">
          <option value="">Zgjidhni</option>
          <option value="WORKER">Punëtori</option>
          <option value="OWNER">Pronari</option>
        </select>
      </div>
    `
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
            <p class="auth-subtitle">Kyçu në llogarinë tënde</p>
          </header>
          ${demoBanner}
          <form id="login-form" class="auth-form">
            <div class="auth-field">
              <label for="email" class="auth-label">Email</label>
              <input type="email" id="email" name="email" required placeholder="email@shembull.com" autocomplete="email" class="auth-input" />
            </div>
            <div class="auth-field">
              <label for="password" class="auth-label">Fjalëkalim</label>
              <input type="password" id="password" name="password" required placeholder="••••••••" autocomplete="current-password" class="auth-input" />
            </div>
            <p id="login-error" class="auth-error" aria-live="polite"></p>
            <button type="submit" id="login-btn" class="auth-primary-button">
              Kyçu
            </button>
          </form>
          <p class="mt-4 text-center text-sm text-slate-500">
            Nuk ke llogari?
            <button type="button" id="btn-regjistrohu" class="auth-link bg-none border-none cursor-pointer p-0">
              Regjistrohu
            </button>
          </p>
        </div>
      </div>
      <div class="auth-hero-right">
        <h2 class="auth-hero-title">
          Menaxhimi i <strong>mungesave të barnave</strong><br />në mënyrë inteligjente
        </h2>
        <p class="auth-hero-text">
          FlowInventory ndihmon farmacitë të regjistrojnë mungesat dhe të krijojnë porosi për furnitorët në sekonda.
        </p>
        <div class="auth-hero-features">
          <div class="auth-hero-feature">
            <div class="auth-hero-feature-icon">↻</div>
            <div>
              <div class="auth-hero-feature-title">Realtime Updates</div>
              <div class="auth-hero-feature-text">Shiko mungesat menjëherë, pa rifreskim të faqes.</div>
            </div>
          </div>
          <div class="auth-hero-feature">
            <div class="auth-hero-feature-icon">✓</div>
            <div>
              <div class="auth-hero-feature-title">Smart Orders</div>
              <div class="auth-hero-feature-text">Gjenero porosi sipas furnitorit me një klik.</div>
            </div>
          </div>
          <div class="auth-hero-feature">
            <div class="auth-hero-feature-icon">💬</div>
            <div>
              <div class="auth-hero-feature-title">WhatsApp Ready</div>
              <div class="auth-hero-feature-text">Dërgo porositë direkt në WhatsApp, pa screenshot.</div>
            </div>
          </div>
        </div>
        <div class="auth-hero-illustration">
          <div class="auth-hero-illustration-text">
            Panel orientues për mungesat dhe porositë e fundit. Këtu mund të vendosim një ilustrim real më vonë.
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

  const form = document.getElementById('login-form') as HTMLFormElement
  const errorEl = document.getElementById('login-error')!
  const btn = document.getElementById('login-btn') as HTMLButtonElement
  const pillWrap = document.getElementById('auth-pill-wrap')!
  const btnRegjistrohu = document.getElementById('btn-regjistrohu')!

  btnRegjistrohu.addEventListener('click', () => {
    pillWrap.classList.add('pill-go')
    setTimeout(() => {
      window.location.hash = '#/regjistrohu'
    }, 700)
  })

  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    errorEl.textContent = ''
    btn.disabled = true
    const email = (form.email as HTMLInputElement).value.trim()
    const password = (form.password as HTMLInputElement).value

    try {
      const profile = await signIn(email, password)
      redirectByRole(profile.role)
    } catch (err) {
      errorEl.textContent = (err instanceof Error ? err.message : 'Kyçja dështoi. Provoni përsëri.')
      btn.disabled = false
    }
  })
}
