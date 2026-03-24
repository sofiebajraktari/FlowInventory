import {
  signIn,
  signOut,
  redirectByRole,
  requestPasswordReset,
  completePasswordRecovery,
  clearPasswordRecoveryPending,
  isPasswordRecoveryPending,
} from '../lib/auth.js'

const AUTH_SWITCH_KEY = 'flowinventory-auth-switch-intent'
const REMEMBER_EMAIL_KEY = 'flowinventory_remember_email'
const RESET_SUCCESS_KEY = 'flowinventory_password_reset_success'
const iconEye = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3" stroke-width="2"/></svg>`
const iconEyeOff = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3l18 18"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.58 10.58A2 2 0 0012 14a2 2 0 001.42-.58"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.88 5.09A10.94 10.94 0 0112 5c6.5 0 10 7 10 7a19.17 19.17 0 01-4.07 5.06"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6.61 6.62A19.03 19.03 0 002 12s3.5 7 10 7a10.9 10.9 0 005.23-1.32"/></svg>`
const iconMail = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V7a1 1 0 011-1z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l9 6 9-6"/></svg>`
const iconLock = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><rect x="4" y="11" width="16" height="9" rx="2" ry="2" stroke-width="2"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 11V8a4 4 0 118 0v3"/></svg>`

function mapLoginError(err: unknown): string {
  const fallback = 'Kyçja dështoi.'
  if (!(err instanceof Error)) return fallback
  const msg = err.message || fallback
  const lower = msg.toLowerCase()

  if (lower.includes('invalid login credentials')) {
    return 'Email ose fjalëkalim i pasaktë.'
  }
  if (lower.includes('email not confirmed')) {
    return 'Verifiko emailin para kyçjes.'
  }
  if (lower.includes('rate limit')) {
    return 'Shumë tentativa. Prit pak dhe provo përsëri.'
  }
  return msg
}

function mapResetError(err: unknown): string {
  if (!(err instanceof Error)) return 'Dërgimi i linkut dështoi.'
  const msg = (err.message || '').toLowerCase()
  if (msg.includes('invalid email')) return 'Shkruaj një email valid.'
  if (msg.includes('rate limit')) return 'Shumë kërkesa. Prit pak dhe provo përsëri.'
  return 'Dërgimi i linkut dështoi.'
}

function animateAuthSwitch(targetHash: string): void {
  const shell = document.getElementById('auth-shell')
  sessionStorage.setItem(AUTH_SWITCH_KEY, 'to-register')
  if (!shell) {
    window.location.hash = targetHash
    return
  }
  shell.classList.add('auth-switch-to-register')
  shell.classList.add('auth-switching')
  window.setTimeout(() => {
    window.location.hash = targetHash
  }, 300)
}

export function renderLogin(container: HTMLElement): void {
  const recoveryMode = isPasswordRecoveryPending()
  const switchIntent = sessionStorage.getItem(AUTH_SWITCH_KEY)
  if (switchIntent) sessionStorage.removeItem(AUTH_SWITCH_KEY)
  const enterClass = switchIntent ? `auth-enter auth-enter-to-login` : ''

  container.innerHTML = `
    <div class="auth-neo-page">
      <div id="auth-shell" class="auth-neo-shell auth-neo-shell-login ${enterClass}">
        <section class="auth-neo-form">
          <div class="auth-card auth-neo-form-card">
            <div class="auth-simple-brand">
              <img src="/brand/flowguard/logo.png" alt="FlowInventory" width="34" height="34" class="rounded-full object-cover" />
              <span>FlowInventory</span>
            </div>

            <header class="auth-header">
              <h1 class="auth-title">${recoveryMode ? 'Vendos fjalëkalim të ri' : 'Kyçu në panel'}</h1>
              <p class="auth-subtitle">${recoveryMode ? 'Zgjidh fjalëkalimin e ri për llogarinë tënde.' : 'Hyr dhe menaxho mungesat e ditës.'}</p>
            </header>

            <form id="login-form" class="auth-form auth-login-form">
              ${
                recoveryMode
                  ? `
              <div class="auth-field">
                <label for="password" class="auth-label">Fjalëkalimi i ri</label>
                <div class="auth-password-wrap">
                  <span class="auth-input-icon" aria-hidden="true">${iconLock}</span>
                  <input type="password" id="password" name="password" required minlength="6" placeholder="Minimum 6 karaktere" autocomplete="new-password" class="auth-input auth-input-password auth-input-has-icon" />
                  <button type="button" id="toggle-login-password" class="auth-password-toggle" aria-label="Shfaq fjalëkalimin" title="Shfaq/fshih fjalëkalimin">${iconEye}</button>
                </div>
              </div>
              <div class="auth-field">
                <label for="password-confirm" class="auth-label">Përsërite fjalëkalimin</label>
                <div class="auth-input-with-icon">
                  <span class="auth-input-icon" aria-hidden="true">${iconLock}</span>
                  <input type="password" id="password-confirm" name="passwordConfirm" required minlength="6" placeholder="Përsërite fjalëkalimin" autocomplete="new-password" class="auth-input auth-input-has-icon" />
                </div>
              </div>
              `
                  : `
              <div class="auth-field">
                <label for="email" class="auth-label">Email</label>
                <div class="auth-input-with-icon">
                  <span class="auth-input-icon" aria-hidden="true">${iconMail}</span>
                  <input type="email" id="email" name="email" required placeholder="Shkruaj email-in" autocomplete="email" class="auth-input auth-input-has-icon" />
                </div>
              </div>
              <div class="auth-field">
                <label for="password" class="auth-label">Fjalëkalimi</label>
                <div class="auth-password-wrap">
                  <span class="auth-input-icon" aria-hidden="true">${iconLock}</span>
                  <input type="password" id="password" name="password" required placeholder="••••••••" autocomplete="current-password" class="auth-input auth-input-password auth-input-has-icon" />
                  <button type="button" id="toggle-login-password" class="auth-password-toggle" aria-label="Shfaq fjalëkalimin" title="Shfaq/fshih fjalëkalimin">${iconEye}</button>
                </div>
              </div>
              <div class="auth-login-options">
                <label class="auth-remember">
                  <input type="checkbox" id="remember-me" />
                  <span>Remember me</span>
                </label>
                <button type="button" id="forgot-password" class="auth-link auth-link-muted">Forgot password?</button>
              </div>
              `
              }
              <p id="login-error" class="auth-error" aria-live="polite"></p>
              <button type="submit" id="login-btn" class="auth-primary-button">${recoveryMode ? 'Ruaj fjalëkalimin' : 'Kyçu'}</button>
              ${
                recoveryMode
                  ? ''
                  : '<p class="auth-switch-inline">Nuk ke llogari? <button type="button" id="btn-regjistrohu-inline" class="auth-switch-link">Regjistrohu</button></p>'
              }
            </form>
          </div>
        </section>

        <aside class="auth-neo-panel">
          <h2 class="auth-neo-panel-title">Menaxho gjithçka në një vend</h2>
          <p class="auth-neo-panel-copy auth-neo-panel-copy-min">
            Nga mungesat tek porositë, çdo hap i operimit ditor qëndron i sinkronizuar në një rrjedhë të vetme.
          </p>
          <button type="button" id="btn-regjistrohu" class="auth-neo-panel-btn">${recoveryMode ? 'Kthehu te kyçja' : 'Regjistrohu'}</button>
        </aside>
      </div>
    </div>
  `

  const form = document.getElementById('login-form') as HTMLFormElement
  const errorEl = document.getElementById('login-error')!
  const btn = document.getElementById('login-btn') as HTMLButtonElement
  const btnRegjistrohu = document.getElementById('btn-regjistrohu')!
  const btnRegjistrohuInline = document.getElementById('btn-regjistrohu-inline') as HTMLButtonElement | null
  const emailInput = document.getElementById('email') as HTMLInputElement | null
  const passwordInput = document.getElementById('password') as HTMLInputElement | null
  const passwordConfirmInput = document.getElementById('password-confirm') as HTMLInputElement | null
  const togglePasswordBtn = document.getElementById('toggle-login-password') as HTMLButtonElement | null
  const rememberMe = document.getElementById('remember-me') as HTMLInputElement | null
  const forgotPasswordBtn = document.getElementById('forgot-password') as HTMLButtonElement | null
  const shell = document.getElementById('auth-shell')

  const clearInputError = (...inputs: Array<HTMLInputElement | null>): void => {
    inputs.forEach((input) => input?.classList.remove('auth-input-error'))
  }
  const markInputError = (...inputs: Array<HTMLInputElement | null>): void => {
    inputs.forEach((input) => input?.classList.add('auth-input-error'))
  }
  const setError = (message: string): void => {
    errorEl.classList.remove('auth-error-success')
    errorEl.textContent = message
  }
  const setSuccess = (message: string): void => {
    errorEl.classList.add('auth-error-success')
    errorEl.textContent = message
  }

  if (shell?.classList.contains('auth-enter')) {
    requestAnimationFrame(() => {
      shell.classList.add('auth-enter-active')
    })
  }

  btnRegjistrohu.addEventListener('click', () => {
    if (recoveryMode) {
      clearPasswordRecoveryPending()
      window.location.hash = '#/kycu'
      return
    }
    animateAuthSwitch('#/regjistrohu')
  })
  btnRegjistrohuInline?.addEventListener('click', () => {
    animateAuthSwitch('#/regjistrohu')
  })

  if (!recoveryMode) {
    try {
      const remembered = localStorage.getItem(REMEMBER_EMAIL_KEY)
      if (remembered && emailInput) {
        emailInput.value = remembered
        if (rememberMe) rememberMe.checked = true
      }
    } catch {
    }
  } else {
    try {
      const success = sessionStorage.getItem(RESET_SUCCESS_KEY)
      if (success) {
        sessionStorage.removeItem(RESET_SUCCESS_KEY)
      }
    } catch {
    }
  }

  togglePasswordBtn?.addEventListener('click', () => {
    if (!passwordInput) return
    const isPassword = passwordInput.type === 'password'
    passwordInput.type = isPassword ? 'text' : 'password'
    togglePasswordBtn.innerHTML = isPassword ? iconEyeOff : iconEye
    togglePasswordBtn.setAttribute('aria-label', isPassword ? 'Fshih fjalëkalimin' : 'Shfaq fjalëkalimin')
  })

  forgotPasswordBtn?.addEventListener('click', async () => {
    errorEl.textContent = ''
    errorEl.classList.remove('auth-error-success')
    const email = (emailInput?.value ?? '').trim()
    if (!email) {
      markInputError(emailInput)
      setError('Shkruaj emailin për rikthim të fjalëkalimit.')
      return
    }
    clearInputError(emailInput)
    forgotPasswordBtn.disabled = true
    try {
      await requestPasswordReset(email)
      setSuccess('Linku për reset u dërgua në email.')
    } catch (err) {
      setError(mapResetError(err))
    } finally {
      forgotPasswordBtn.disabled = false
    }
  })

  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    errorEl.textContent = ''
    errorEl.classList.remove('auth-error-success')
    const emailEl = form.querySelector('[name="email"]') as HTMLInputElement | null
    const passwordEl = form.querySelector('[name="password"]') as HTMLInputElement | null
    const passwordConfirmEl = form.querySelector('[name="passwordConfirm"]') as HTMLInputElement | null
    const email = (emailEl?.value ?? '').trim()
    const password = passwordEl?.value ?? ''
    const passwordConfirm = passwordConfirmEl?.value ?? ''
    clearInputError(emailEl, passwordEl, passwordConfirmEl)
    if (!recoveryMode && !email.includes('@')) {
      markInputError(emailEl)
      setError('Shkruaj një email valid.')
      return
    }
    if (recoveryMode) {
      if (password.length < 6) {
        markInputError(passwordEl, passwordConfirmEl)
        setError('Fjalëkalimi duhet të ketë të paktën 6 karaktere.')
        return
      }
      if (password !== passwordConfirm) {
        markInputError(passwordEl, passwordConfirmEl)
        setError('Fjalëkalimet nuk përputhen.')
        return
      }
    }
    btn.disabled = true
    btn.classList.add('auth-btn-loading')
    const originalBtnLabel = btn.textContent
    btn.textContent = recoveryMode ? 'Duke ruajtur...' : 'Duke u kyçur...'
    try {
      if (recoveryMode) {
        await completePasswordRecovery(password)
        try {
          sessionStorage.setItem(RESET_SUCCESS_KEY, '1')
        } catch {
        }
        await signOut()
        return
      }
      try {
        if (rememberMe?.checked) localStorage.setItem(REMEMBER_EMAIL_KEY, email)
        else localStorage.removeItem(REMEMBER_EMAIL_KEY)
      } catch {
      }
      const profile = await signIn(email, password)
      redirectByRole(profile.role)
    } catch (err) {
      markInputError(recoveryMode ? passwordEl : emailEl, passwordEl, passwordConfirmEl)
      setError(recoveryMode ? (err instanceof Error ? err.message : 'Ruajtja e fjalëkalimit dështoi.') : mapLoginError(err))
      btn.disabled = false
      btn.textContent = originalBtnLabel
      btn.classList.remove('auth-btn-loading')
    }
  })

  emailInput?.addEventListener('input', () => {
    clearInputError(emailInput)
    errorEl.classList.remove('auth-error-success')
  })
  passwordInput?.addEventListener('input', () => {
    clearInputError(passwordInput)
    errorEl.classList.remove('auth-error-success')
  })
  passwordConfirmInput?.addEventListener('input', () => {
    clearInputError(passwordInput, passwordConfirmInput)
    errorEl.classList.remove('auth-error-success')
  })

  if (!recoveryMode) {
    try {
      const resetSuccess = sessionStorage.getItem(RESET_SUCCESS_KEY)
      if (resetSuccess) {
        sessionStorage.removeItem(RESET_SUCCESS_KEY)
        setSuccess('Fjalëkalimi u ndryshua. Tani kyçu me fjalëkalimin e ri.')
      }
    } catch {
    }
  }
}
