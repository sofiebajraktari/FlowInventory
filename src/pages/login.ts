import { signIn, redirectByRole } from '../lib/auth.js'

function mapLoginError(err: unknown): string {
  const fallback = 'Kyçja dështoi. Provoni përsëri.'
  if (!(err instanceof Error)) return fallback
  const msg = err.message || fallback
  const lower = msg.toLowerCase()
  if (lower.includes('invalid login credentials')) return 'Email ose fjalëkalim i pasaktë.'
  if (lower.includes('email not confirmed')) return 'Email nuk është konfirmuar ende.'
  if (lower.includes('too many requests')) return 'Shumë tentativa. Provo pas pak.'
  return msg
}

export function renderLogin(container: HTMLElement): void {
  container.innerHTML = `
    <div class="auth-hero">
      <div class="auth-hero-left">
        <div class="auth-card">
          <header class="auth-header">
            <div class="flex items-center justify-between mb-2">
              <p class="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-sky-700">
                <img src="/brand/flowguard/logo.png" alt="FlowGuard logo" class="h-4 w-4 rounded-full object-cover" />
                FlowInventory
              </p>
              <button type="button" data-theme-toggle="1" class="theme-toggle-chip rounded-full px-2.5 py-1 text-[11px] font-semibold"></button>
            </div>
            <h1 class="auth-title">Kyçu në llogarinë tënde</h1>
            <p class="auth-subtitle">Paneli i menaxhimit të mungesave për farmaci</p>
          </header>
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
          Menaxho farmacinë me<br /><strong>rrjedhë të qartë pune</strong>
        </h2>
        <p class="auth-hero-text">
          Nga regjistrimi i mungesës te porosia për furnitor, gjithçka ndodh në një vend dhe në kohë reale.
        </p>
        <div class="auth-hero-features">
          <div class="auth-hero-feature">
            <div class="auth-hero-feature-icon">↻</div>
            <div>
              <div class="auth-hero-feature-title">Përditësim i menjëhershëm</div>
              <div class="auth-hero-feature-text">Punëtori dhe pronari shohin të njëjtat të dhëna live.</div>
            </div>
          </div>
          <div class="auth-hero-feature">
            <div class="auth-hero-feature-icon">✓</div>
            <div>
              <div class="auth-hero-feature-title">Porosi sipas furnitorit</div>
              <div class="auth-hero-feature-text">Gjenerim i shpejtë i porosive nga mungesat e ditës.</div>
            </div>
          </div>
          <div class="auth-hero-feature">
            <div class="auth-hero-feature-icon">💬</div>
            <div>
              <div class="auth-hero-feature-title">Gati për komunikim</div>
              <div class="auth-hero-feature-text">Reciptat kopjohen lehtë për dërgim te furnitorët.</div>
            </div>
          </div>
        </div>
        <div class="auth-hero-illustration">
          <div class="auth-hero-illustration-text">
            Pamje moderne për ekipin tënd: fokus te shpejtësia, qartësia dhe vendimet e sakta.
          </div>
          <div class="w-40 h-24 rounded-xl border border-sky-300/40 bg-white/70 grid place-items-center">
            <img src="/brand/flowguard/logo.png" alt="FlowGuard logo" class="h-16 w-16 object-contain" />
          </div>
        </div>
      </div>
    </div>
  `

  const form = document.getElementById('login-form') as HTMLFormElement
  const errorEl = document.getElementById('login-error')!
  const btn = document.getElementById('login-btn') as HTMLButtonElement
  const btnRegjistrohu = document.getElementById('btn-regjistrohu')!

  btnRegjistrohu.addEventListener('click', () => {
    window.location.hash = '#/regjistrohu'
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
      errorEl.textContent = mapLoginError(err)
      btn.disabled = false
    }
  })
}
