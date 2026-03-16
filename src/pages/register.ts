import { signUp, redirectByRole } from '../lib/auth.js'
import { isSupabaseConfigured } from '../lib/supabase.js'
import type { UserRole } from '../types.js'

export function renderRegister(container: HTMLElement): void {
  const demoBanner = !isSupabaseConfigured
    ? '<div class="auth-demo-banner">Modalitet demo – pa backend.</div>'
    : ''

  container.innerHTML = `
    <div class="auth-hero">
      <div class="auth-hero-left">
        <div class="auth-card">
          <header class="auth-header">
            <div class="flex items-center justify-between mb-2">
              <p class="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-sky-700">FlowInventory</p>
              <button type="button" data-theme-toggle="1" class="theme-toggle-chip rounded-full px-2.5 py-1 text-[11px] font-semibold"></button>
            </div>
            <h1 class="auth-title">Krijo llogari të re</h1>
            <p class="auth-subtitle">Vendos rolin dhe nis përdorimin e panelit</p>
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
          Krijo ekipin tënd të farmacisë<br />me <strong>dy role të qarta</strong>
        </h2>
        <p class="auth-hero-text">
          Punëtori regjistron mungesat, pronari gjeneron porositë. Fluks i thjeshtë, i shpejtë dhe i kontrolluar.
        </p>
        <div class="auth-hero-features">
          <div class="auth-hero-feature">
            <div class="auth-hero-feature-icon">👥</div>
            <div>
              <div class="auth-hero-feature-title">Dy role të thjeshta</div>
              <div class="auth-hero-feature-text">Akses i qartë për punëtorin dhe pronarin.</div>
            </div>
          </div>
          <div class="auth-hero-feature">
            <div class="auth-hero-feature-icon">⚙️</div>
            <div>
              <div class="auth-hero-feature-title">Konfigurim i shpejtë</div>
              <div class="auth-hero-feature-text">Regjistro përdoruesit dhe fillo përdorimin menjëherë.</div>
            </div>
          </div>
          <div class="auth-hero-feature">
            <div class="auth-hero-feature-icon">✅</div>
            <div>
              <div class="auth-hero-feature-title">Gati për demo</div>
              <div class="auth-hero-feature-text">Pamje profesionale për prezantim te menaxhmenti.</div>
            </div>
          </div>
        </div>
        <div class="auth-hero-illustration">
          <div class="auth-hero-illustration-text">
            I njëjti sistem i unifikuar për regjistrim, mungesa dhe porosi.
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
  const btnKycu = document.getElementById('btn-kycu')!

  btnKycu.addEventListener('click', () => {
    window.location.hash = '#/kycu'
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
