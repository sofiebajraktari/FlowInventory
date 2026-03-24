import { signUp, redirectByRole } from '../lib/auth.js'
import type { UserRole } from '../types.js'

const AUTH_SWITCH_KEY = 'flowinventory-auth-switch-intent'
const iconEye = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3" stroke-width="2"/></svg>`
const iconEyeOff = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3l18 18"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.58 10.58A2 2 0 0012 14a2 2 0 001.42-.58"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.88 5.09A10.94 10.94 0 0112 5c6.5 0 10 7 10 7a19.17 19.17 0 01-4.07 5.06"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6.61 6.62A19.03 19.03 0 002 12s3.5 7 10 7a10.9 10.9 0 005.23-1.32"/></svg>`

function mapRegisterError(err: unknown): string {
  const fallback = 'Regjistrimi dështoi.'
  if (!(err instanceof Error)) return fallback
  const msg = err.message || fallback
  const lower = msg.toLowerCase()

  if (lower.includes('email rate limit exceeded')) {
    return 'Keni bërë shumë tentativa me email. Prit 1-2 minuta, pastaj provo përsëri ose kyçu nëse llogaria është krijuar.'
  }
  if (lower.includes('already registered') || lower.includes('already been registered')) {
    return 'Ky email ekziston. Provo Kyçu.'
  }
  return msg
}

function animateAuthSwitch(targetHash: string): void {
  const shell = document.getElementById('auth-shell')
  sessionStorage.setItem(AUTH_SWITCH_KEY, 'to-login')
  if (!shell) {
    window.location.hash = targetHash
    return
  }
  shell.classList.add('auth-switch-to-login')
  shell.classList.add('auth-switching')
  window.setTimeout(() => {
    window.location.hash = targetHash
  }, 300)
}

export function renderRegister(container: HTMLElement): void {
  const switchIntent = sessionStorage.getItem(AUTH_SWITCH_KEY)
  if (switchIntent) sessionStorage.removeItem(AUTH_SWITCH_KEY)
  const enterClass = switchIntent ? `auth-enter auth-enter-to-register` : ''

  container.innerHTML = `
    <div class="auth-neo-page">
      <div id="auth-shell" class="auth-neo-shell auth-neo-shell-register ${enterClass}">
        <section class="auth-neo-form">
          <div class="auth-card auth-neo-form-card">
            <div class="auth-simple-brand">
              <img src="/brand/flowguard/logo.png" alt="FlowInventory" width="34" height="34" class="rounded-full object-cover" />
              <span>FlowInventory</span>
            </div>

            <header class="auth-header">
              <h1 class="auth-title">Krijo llogarinë</h1>
              <p class="auth-subtitle">Plotëso të dhënat dhe zgjidh rolin.</p>
            </header>

            <form id="register-form" class="auth-form">
              <div class="grid gap-3 sm:grid-cols-2">
                <div class="auth-field">
                  <label for="reg-first-name" class="auth-label">Emri</label>
                  <input type="text" id="reg-first-name" name="firstName" required placeholder="Emri" autocomplete="given-name" class="auth-input" />
                </div>
                <div class="auth-field">
                  <label for="reg-last-name" class="auth-label">Mbiemri</label>
                  <input type="text" id="reg-last-name" name="lastName" required placeholder="Mbiemri" autocomplete="family-name" class="auth-input" />
                </div>
              </div>
              <div class="auth-field">
                <label for="reg-email" class="auth-label">Email</label>
                <input type="email" id="reg-email" name="email" required placeholder="Shkruaj email-in" autocomplete="email" class="auth-input" />
              </div>
              <div class="auth-field">
                <label for="reg-password" class="auth-label">Fjalëkalim</label>
                <div class="auth-password-wrap">
                  <input type="password" id="reg-password" name="password" required minlength="6" placeholder="Minimum 6 karaktere" autocomplete="new-password" class="auth-input auth-input-password" />
                  <button type="button" id="toggle-register-password" class="auth-password-toggle" aria-label="Shfaq fjalëkalimin" title="Shfaq/fshih fjalëkalimin">${iconEye}</button>
                </div>
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
              <button type="submit" id="register-btn" class="auth-primary-button">Krijo llogarinë</button>
            </form>
          </div>
        </section>

        <aside class="auth-neo-panel">
          <h2 class="auth-neo-panel-title">Qasje sipas rolit dhe përgjegjësisë</h2>
          <p class="auth-neo-panel-copy auth-neo-panel-copy-min">
            Regjistro ekipin me role të qarta dhe kalim të menjëhershëm në panelin përkatës, pa hapa të tepërt.
          </p>
          <button type="button" id="btn-kycu" class="auth-neo-panel-btn">Kthehu te kyçja</button>
        </aside>
      </div>
    </div>
  `

  const form = document.getElementById('register-form') as HTMLFormElement
  const errorEl = document.getElementById('register-error')!
  const btn = document.getElementById('register-btn') as HTMLButtonElement
  const btnKycu = document.getElementById('btn-kycu')!
  const passwordInput = document.getElementById('reg-password') as HTMLInputElement | null
  const togglePasswordBtn = document.getElementById('toggle-register-password') as HTMLButtonElement | null
  const emailInput = document.getElementById('reg-email') as HTMLInputElement | null
  const roleInput = document.getElementById('reg-role') as HTMLSelectElement | null
  const shell = document.getElementById('auth-shell')

  const clearInputError = (...inputs: Array<HTMLInputElement | HTMLSelectElement | null>): void => {
    inputs.forEach((input) => input?.classList.remove('auth-input-error'))
  }
  const markInputError = (...inputs: Array<HTMLInputElement | HTMLSelectElement | null>): void => {
    inputs.forEach((input) => input?.classList.add('auth-input-error'))
  }

  if (shell?.classList.contains('auth-enter')) {
    requestAnimationFrame(() => {
      shell.classList.add('auth-enter-active')
    })
  }

  btnKycu.addEventListener('click', () => {
    animateAuthSwitch('#/kycu')
  })

  togglePasswordBtn?.addEventListener('click', () => {
    if (!passwordInput) return
    const isPassword = passwordInput.type === 'password'
    passwordInput.type = isPassword ? 'text' : 'password'
    togglePasswordBtn.innerHTML = isPassword ? iconEyeOff : iconEye
    togglePasswordBtn.setAttribute('aria-label', isPassword ? 'Fshih fjalëkalimin' : 'Shfaq fjalëkalimin')
  })

  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    errorEl.textContent = ''
    btn.disabled = true
    const firstNameEl = form.querySelector('[name="firstName"]') as HTMLInputElement | null
    const lastNameEl = form.querySelector('[name="lastName"]') as HTMLInputElement | null
    const emailEl = form.querySelector('[name="email"]') as HTMLInputElement | null
    const passwordEl = form.querySelector('[name="password"]') as HTMLInputElement | null
    const firstName = (firstNameEl?.value ?? '').trim()
    const lastName = (lastNameEl?.value ?? '').trim()
    const email = (emailEl?.value ?? '').trim()
    const password = passwordEl?.value ?? ''
    const roleEl = form.querySelector('[name="role"]') as HTMLSelectElement | null
    const role = (roleEl?.value ?? '') as UserRole
    clearInputError(emailEl, passwordEl, roleEl)
    if (!email.includes('@')) {
      markInputError(emailEl)
      errorEl.textContent = 'Shkruaj një email valid.'
      btn.disabled = false
      return
    }
    if (!role) {
      markInputError(roleEl)
      errorEl.textContent = 'Zgjidh rolin.'
      btn.disabled = false
      return
    }
    try {
      const result = await signUp(email, password, role, firstName, lastName)
      if (result.emailConfirmationRequired) {
        errorEl.textContent = 'Llogaria u krijua. Verifiko emailin, pastaj kyçu.'
        btn.disabled = false
        window.setTimeout(() => {
          window.location.hash = '#/kycu'
        }, 1200)
        return
      }
      redirectByRole(result.role)
    } catch (err) {
      markInputError(emailEl, passwordEl, roleEl)
      errorEl.textContent = mapRegisterError(err)
      btn.disabled = false
    }
  })

  emailInput?.addEventListener('input', () => clearInputError(emailInput))
  passwordInput?.addEventListener('input', () => clearInputError(passwordInput))
  roleInput?.addEventListener('change', () => clearInputError(roleInput))
}
