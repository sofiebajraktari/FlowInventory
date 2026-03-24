import { signOut } from '../lib/auth.js'
import {
  addMungese,
  getProducts,
  getTodayShortages,
  type ProductView,
  type ShortageView,
} from '../lib/data.js'
import { rankProductsForWorkerSearch } from '../lib/fuzzyProductSearch.js'

const iconLogout = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>`
const iconSearch = `<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 117.5-7.5 7.5 7.5 0 01-7.5 7.5z" /></svg>`
const iconMenu = `<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" /></svg>`
const iconKpiTotal = `<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></svg>`
const iconKpiProducts = `<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" /></svg>`
const iconKpiUrgent = `<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4m0 4h.01" /></svg>`
type WorkerSection = 'mungesat'

function renderResults(results: ProductView[]): string {
  if (!results.length) {
    return `<div class="premium-empty">
      <div class="premium-empty-title">Nuk u gjet asnjë bar</div>
      <p class="premium-empty-copy">Kontrollo drejtshkrimin ose provo me emër tjetër.</p>
    </div>`
  }
  return `
    <ul class="mt-2 overflow-hidden rounded-xl border border-slate-200 divide-y divide-slate-200 bg-white">
      ${results
        .map(
          (p) => `
        <li>
          <button type="button" class="w-full text-left px-3 py-2.5 hover:bg-slate-50 flex items-center justify-between gap-2 select-product transition-colors" data-id="${p.id}">
            <div>
              <div class="text-sm font-medium text-slate-800">${p.name}</div>
              <div class="text-xs text-slate-500">Furnitori: ${p.supplierName}</div>
            </div>
            <span class="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full border border-slate-300 text-slate-600">
              ${p.category === 'barna' ? 'Barna' : 'Front'}
            </span>
          </button>
        </li>`
        )
        .join('')}
    </ul>
  `
}

function renderMissingList(missingItems: ShortageView[]): string {
  if (!missingItems.length) {
    return `<div class="premium-empty">
      <div class="premium-empty-title">Nuk ka mungesa për sot</div>
      <p class="premium-empty-copy">Gjendja është e stabilizuar për momentin.</p>
    </div>`
  }
  return `
    <div class="worker-missing-table-wrap overflow-hidden rounded-xl border border-slate-200 bg-white">
      <table class="min-w-full text-xs">
        <thead class="worker-missing-head ui-table-head bg-slate-100 text-slate-700">
          <tr>
            <th class="px-3 py-2 text-left font-medium">Bari</th>
            <th class="px-3 py-2 text-left font-medium">Furnitori</th>
            <th class="px-3 py-2 text-left font-medium">Urgjent</th>
            <th class="px-3 py-2 text-left font-medium">Shënim</th>
            <th class="px-3 py-2 text-right font-medium">Shtuar</th>
          </tr>
        </thead>
        <tbody>
          ${missingItems
            .map(
              (m) => `
            <tr class="worker-missing-row border-t border-slate-200 hover:bg-slate-50/70 transition-colors">
              <td class="worker-missing-product px-3 py-2.5 font-medium text-slate-800">${m.productName}</td>
              <td class="worker-missing-supplier px-3 py-2.5 text-slate-600">${m.supplierName}</td>
              <td class="px-3 py-2.5">
                ${
                  m.urgent
                    ? '<span class="worker-missing-status worker-missing-status-urgent inline-flex rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700 border border-red-200">URGJENT</span>'
                    : '<span class="worker-missing-status worker-missing-status-normal inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 border border-slate-200">Normal</span>'
                }
              </td>
              <td class="worker-missing-note px-3 py-2.5 text-slate-600">${m.note || '—'}</td>
              <td class="px-3 py-2.5 text-right">
                <span class="worker-missing-count inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700 border border-slate-200">x${m.addedCount}</span>
              </td>
            </tr>`
            )
            .join('')}
        </tbody>
      </table>
    </div>
  `
}

export function renderMungesat(container: HTMLElement, _routeSection = 'mungesat'): void {
  const section: WorkerSection = 'mungesat'
  const active = (key: WorkerSection): string => (section === key ? 'premium-nav-link active' : 'premium-nav-link')
  let allProducts: ProductView[] = []

  function showToast(message: string): void {
    const existing = document.getElementById('worker-toast')
    if (existing) existing.remove()
    const toast = document.createElement('div')
    toast.id = 'worker-toast'
    toast.className =
      'fixed bottom-4 right-4 z-50 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-lg'
    toast.textContent = message
    document.body.appendChild(toast)
    window.setTimeout(() => toast.remove(), 1600)
  }

  container.innerHTML = `
    <div id="worker-shell" class="premium-shell">
      <aside id="worker-sidebar" class="premium-sidebar premium-drawer flex flex-col justify-between px-4 py-5">
        <div>
          <div class="mb-6 flex items-center justify-between gap-2">
            <div class="flex items-center gap-2">
              <div class="w-9 h-9 rounded-2xl bg-white flex items-center justify-center shadow">
                <img src="/brand/flowguard/logo.png" alt="FlowGuard logo" class="w-7 h-7 rounded-full object-cover" />
              </div>
              <span class="text-sm font-semibold text-slate-900">FlowInventory</span>
            </div>
            <button type="button" id="worker-nav-toggle" class="premium-nav-toggle worker-nav-toggle-btn shrink-0" aria-label="Hap menynë" aria-expanded="true">
              ${iconMenu}
            </button>
          </div>
          <nav class="space-y-1 text-sm">
            <a href="#/mungesat" class="${active('mungesat')}"><span class="premium-nav-dot"></span>Mungesat</a>
          </nav>
        </div>
        <div class="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2.5">
          <div class="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-sm font-semibold text-blue-700">P</div>
          <div class="text-xs">
            <div class="text-slate-900 font-medium">Punëtor</div>
            <div class="text-slate-500 text-[11px]">Worker</div>
          </div>
        </div>
      </aside>
      <div id="worker-sidebar-backdrop" class="premium-sidebar-backdrop hidden"></div>
      <button
        type="button"
        id="worker-logo-reopen"
        class="worker-logo-reopen hidden"
        aria-label="Hap menynë"
        title="Hap menynë"
      >
        <img src="/brand/flowguard/logo.png" alt="FlowInventory" class="h-6 w-6 rounded-full object-cover" />
      </button>

      <main class="premium-main px-4 py-4 md:px-6 md:py-5">
        <header class="premium-header mb-5 border-b border-slate-200 pb-4">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div class="flex min-w-0 items-center gap-3">
              <div class="min-w-0">
                <p class="text-xs uppercase tracking-wide text-slate-500">Mungesat</p>
                <h1 class="text-xl md:text-2xl font-semibold tracking-tight text-slate-900">Shto mungesa shpejt (pa sasi)</h1>
                <p class="mt-1 text-xs text-slate-500">Lista nuk prishet: një rresht për bar, sistemi rrit numrin e shtimeve.</p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <button type="button" data-theme-toggle="1" class="theme-toggle-chip rounded-full px-2.5 py-1 text-[11px] font-semibold"></button>
              <button type="button" id="btn-signout" class="premium-btn-ghost inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs">
                ${iconLogout}
                Dil
              </button>
            </div>
          </div>
        </header>

        <section class="${section === 'mungesat' ? '' : 'hidden '}premium-card mb-4 p-5">
          <div class="mb-3 flex flex-wrap items-center gap-2 text-[11px]">
            <span class="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-slate-700">
              ${iconKpiTotal}
              Totali: <strong id="worker-stat-total" class="font-semibold text-slate-900">0</strong>
            </span>
            <span class="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-slate-700">
              ${iconKpiProducts}
              Produkte: <strong id="worker-stat-products" class="font-semibold text-slate-900">0</strong>
            </span>
            <span class="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-slate-700">
              ${iconKpiUrgent}
              Urgjente: <strong id="worker-stat-urgent" class="font-semibold text-slate-900">0</strong>
            </span>
          </div>
          <div class="space-y-3">
            <div>
              <label for="search-bar" class="sr-only">Kërko barin</label>
              <div class="premium-top-search">
                <span class="premium-top-search-icon">${iconSearch}</span>
                <input id="search-bar" type="text" autocomplete="off" placeholder="Kërko barin…" class="premium-top-search-input" aria-label="Kërko barin" />
              </div>
            </div>
            <div class="flex flex-col sm:flex-row sm:items-center gap-2 text-sm text-slate-700">
              <label class="inline-flex items-center gap-2">
                <input id="urgent-toggle" type="checkbox" class="h-4 w-4 rounded border-slate-300 bg-white text-red-500 focus:ring-blue-500" />
                URGJENT
              </label>
              <input id="note-input" type="text" placeholder="Shënim (opsional)" class="premium-input flex-1 rounded-lg px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none" aria-label="Shënim opsional" />
            </div>
            <div id="search-results" class="mt-2"></div>
          </div>
        </section>

        <section class="${section === 'mungesat' ? '' : 'hidden '}premium-card p-5">
          <div class="flex items-center justify-between mb-2">
            <h2 class="text-base font-semibold text-slate-900">Lista e mungesave për sot</h2>
            <span class="text-xs text-slate-500">${new Date().toLocaleDateString('sq-AL')}</span>
          </div>
          <div id="missing-list">
            ${renderMissingList([])}
          </div>
        </section>

      </main>
    </div>
  `

  document.getElementById('btn-signout')!.addEventListener('click', () => signOut())
  const navToggle = document.getElementById('worker-nav-toggle') as HTMLButtonElement | null
  const navLogoReopen = document.getElementById('worker-logo-reopen') as HTMLButtonElement | null
  const shell = document.getElementById('worker-shell') as HTMLElement | null
  const sidebar = document.getElementById('worker-sidebar') as HTMLElement | null
  const sidebarBackdrop = document.getElementById('worker-sidebar-backdrop') as HTMLDivElement | null

  const syncNavReopenVisibility = (): void => {
    if (!shell || !sidebar || !navLogoReopen) return
    const isDesktop = window.matchMedia('(min-width: 768px)').matches
    const sidebarOpen = isDesktop
      ? !shell.classList.contains('sidebar-collapsed')
      : sidebar.classList.contains('drawer-open')
    navLogoReopen.classList.toggle('hidden', sidebarOpen)
    navLogoReopen.setAttribute('aria-expanded', sidebarOpen ? 'true' : 'false')
  }

  const setSidebarOpen = (open: boolean): void => {
    if (!sidebar || !sidebarBackdrop || !shell) return
    const isDesktop = window.matchMedia('(min-width: 768px)').matches
    if (isDesktop) {
      shell.classList.toggle('sidebar-collapsed', !open)
      sidebar.classList.remove('drawer-open')
      sidebarBackdrop.classList.add('hidden')
      document.body.classList.remove('overflow-hidden')
      navToggle?.setAttribute('aria-expanded', open ? 'true' : 'false')
      syncNavReopenVisibility()
      return
    }
    sidebar.classList.toggle('drawer-open', open)
    sidebarBackdrop.classList.toggle('hidden', !open)
    document.body.classList.toggle('overflow-hidden', open)
    navToggle?.setAttribute('aria-expanded', open ? 'true' : 'false')
    syncNavReopenVisibility()
  }

  navToggle?.addEventListener('click', () => {
    const isDesktop = window.matchMedia('(min-width: 768px)').matches
    const currentlyOpen = isDesktop
      ? !Boolean(shell?.classList.contains('sidebar-collapsed'))
      : Boolean(sidebar?.classList.contains('drawer-open'))
    setSidebarOpen(!currentlyOpen)
  })
  navLogoReopen?.addEventListener('click', () => setSidebarOpen(true))
  sidebarBackdrop?.addEventListener('click', () => setSidebarOpen(false))
  window.addEventListener('resize', () => {
    const isDesktop = window.matchMedia('(min-width: 768px)').matches
    if (isDesktop) {
      sidebar?.classList.remove('drawer-open')
      sidebarBackdrop?.classList.add('hidden')
      document.body.classList.remove('overflow-hidden')
    }
    syncNavReopenVisibility()
  })
  syncNavReopenVisibility()

  const searchInput = document.getElementById('search-bar') as HTMLInputElement
  const topSearchInput = document.getElementById('search-bar-top') as HTMLInputElement | null
  const urgentToggle = document.getElementById('urgent-toggle') as HTMLInputElement
  const noteInput = document.getElementById('note-input') as HTMLInputElement
  const resultsDiv = document.getElementById('search-results') as HTMLDivElement
  const missingListDiv = document.getElementById('missing-list') as HTMLDivElement
  const statTotal = document.getElementById('worker-stat-total') as HTMLParagraphElement | null
  const statProducts = document.getElementById('worker-stat-products') as HTMLParagraphElement | null
  const statUrgent = document.getElementById('worker-stat-urgent') as HTMLParagraphElement | null

  async function refreshMissingList(): Promise<void> {
    const items = await getTodayShortages()
    missingListDiv.innerHTML = renderMissingList(items)
    if (statTotal) statTotal.textContent = String(items.length)
    if (statUrgent) statUrgent.textContent = String(items.filter((x) => x.urgent).length)
  }

  function updateResults() {
    const q = searchInput.value.trim()
    const matches = !q ? [] : rankProductsForWorkerSearch(allProducts, q, 8)
    resultsDiv.innerHTML = renderResults(matches)

    const buttons = resultsDiv.querySelectorAll<HTMLButtonElement>('button.select-product')
    buttons.forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id
        const incomingNote = noteInput.value.trim()
        const incomingUrgent = urgentToggle.checked

        if (!id) return
        try {
          await addMungese(id, incomingUrgent, incomingNote)
        } catch (error) {
          showToast('Shtimi dështoi.')
          return
        }

        searchInput.value = ''
        if (topSearchInput) topSearchInput.value = ''
        urgentToggle.checked = false
        noteInput.value = ''
        resultsDiv.innerHTML = ''
        await refreshMissingList()

        showToast('Mungesa u shtua.')
      })
    })
  }

  const applySearch = (value: string): void => {
    searchInput.value = value
    if (topSearchInput) topSearchInput.value = value
    updateResults()
  }

  searchInput.addEventListener('input', () => applySearch(searchInput.value))
  topSearchInput?.addEventListener('input', () => applySearch(topSearchInput.value))
  getProducts().then((products) => {
    allProducts = products
    if (statProducts) statProducts.textContent = String(products.length)
  })
  refreshMissingList()
}
