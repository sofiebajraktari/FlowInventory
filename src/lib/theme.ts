const THEME_KEY = 'flowinventory-theme'

export type ThemeMode = 'light' | 'dark'

export function getStoredTheme(): ThemeMode {
  const raw = localStorage.getItem(THEME_KEY)
  return raw === 'dark' ? 'dark' : 'light'
}

export function applyTheme(mode: ThemeMode): void {
  document.body.classList.toggle('theme-dark', mode === 'dark')
}

export function applyStoredTheme(): ThemeMode {
  const mode = getStoredTheme()
  applyTheme(mode)
  return mode
}

export function toggleTheme(): ThemeMode {
  const next: ThemeMode = document.body.classList.contains('theme-dark') ? 'light' : 'dark'
  localStorage.setItem(THEME_KEY, next)
  applyTheme(next)
  return next
}

function getThemeLabel(mode: ThemeMode): string {
  return mode === 'dark' ? '☀' : '☾'
}

export function updateThemeToggleLabels(root: ParentNode = document): void {
  const mode: ThemeMode = document.body.classList.contains('theme-dark') ? 'dark' : 'light'
  const nextLabel = mode === 'dark' ? 'Light mode' : 'Dark mode'
  const switchAria = mode === 'dark' ? 'Kalo në light mode' : 'Kalo në dark mode'
  const icon = getThemeLabel(mode)
  root.querySelectorAll<HTMLElement>('[data-theme-toggle]').forEach((el) => {
    const fixedLabel = el.dataset.themeFixedLabel
    const iconEl = el.querySelector<HTMLElement>('[data-theme-icon]')
    const labelEl = el.querySelector<HTMLElement>('[data-theme-label]')
    if (fixedLabel) {
      el.textContent = fixedLabel
      el.setAttribute('aria-label', switchAria)
      el.setAttribute('title', nextLabel)
      return
    }
    if (iconEl) iconEl.textContent = icon
    if (labelEl) labelEl.textContent = nextLabel
    if (!iconEl && !labelEl) {
      el.textContent = icon
    }
    el.setAttribute('aria-label', switchAria)
    el.setAttribute('title', nextLabel)
  })
}

export function bindThemeToggleButtons(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>('[data-theme-toggle]').forEach((el) => {
    if (el.dataset.themeBound === '1') return
    el.dataset.themeBound = '1'
    el.addEventListener('click', () => {
      toggleTheme()
      updateThemeToggleLabels(document)
    })
  })
  updateThemeToggleLabels(document)
}

