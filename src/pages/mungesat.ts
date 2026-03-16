import { signOut } from '../lib/auth.js'
import {
  addMungese,
  getProducts,
  getTodayShortages,
  type ProductView,
  type ShortageView,
} from '../lib/data.js'

const logoSmall = `<svg class="w-8 h-8 text-pharm-primary shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19.5 12c0-1.2-.5-2.3-1.4-3.1l-2.1-2.1-2.1 2.1a4.5 4.5 0 01-6.4 0l-2.1-2.1-2.1 2.1A4.5 4.5 0 004.5 12a4.5 4.5 0 001.4 3.2l2.1 2.1 2.1-2.1a4.5 4.5 0 016.4 0l2.1 2.1 2.1-2.1a4.5 4.5 0 001.4-3.2z" /></svg>`
const iconLogout = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>`
const iconBolt = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>`
const iconClock = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v5l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`

function renderResults(results: ProductView[]): string {
  if (!results.length) {
    return `<p class="text-sm text-slate-500">Nuk u gjet asnjë bar me këtë kërkim.</p>`
  }
  return `
    <ul class="mt-2 divide-y divide-slate-200">
      ${results
        .map(
          (p) => `
        <li>
          <button type="button" class="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center justify-between gap-2 select-product transition-colors" data-id="${p.id}">
            <div>
              <div class="text-sm text-slate-800">${p.name}</div>
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
    return `<p class="text-sm text-slate-500">Nuk ka mungesa të regjistruara për sot.</p>`
  }
  return `
    <ul class="space-y-2">
      ${missingItems
        .map(
          (m) => `
        <li class="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
          <div>
            <div class="text-sm text-slate-800">${m.productName}</div>
            <div class="text-xs text-slate-500">Furnitori: ${m.supplierName}</div>
            ${
              m.note
                ? `<div class="mt-0.5 text-xs text-slate-600">Shënim: ${m.note}</div>`
                : ''
            }
          </div>
          <div class="flex flex-col items-end gap-1">
            <span class="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-700 border border-slate-200">Shtuar: x${m.addedCount}</span>
            ${m.urgent ? '<span class="rounded-full bg-red-100 px-2 py-0.5 text-[11px] text-red-700 border border-red-200">URGJENT</span>' : ''}
          </div>
        </li>`
        )
        .join('')}
    </ul>
  `
}

export function renderMungesat(container: HTMLElement): void {
  let allProducts: ProductView[] = []

  function showToast(message: string): void {
    const existing = document.getElementById('worker-toast')
    if (existing) existing.remove()
    const toast = document.createElement('div')
    toast.id = 'worker-toast'
    toast.className =
      'fixed bottom-4 right-4 z-50 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-semibold text-white shadow-lg'
    toast.textContent = message
    document.body.appendChild(toast)
    window.setTimeout(() => toast.remove(), 1600)
  }

  container.innerHTML = `
    <div class="premium-shell">
      <aside class="premium-sidebar hidden md:flex flex-col justify-between px-4 py-5">
        <div>
          <div class="flex items-center gap-2 mb-6">
            <div class="w-9 h-9 rounded-2xl bg-white flex items-center justify-center shadow">
              <div class="w-5 h-8 rounded-full bg-linear-to-b from-sky-400 to-white"></div>
            </div>
            <span class="text-sm font-semibold text-white">FlowInventory</span>
          </div>
          <nav class="space-y-1 text-sm">
            <a class="premium-nav-link active">
              <span class="w-1.5 h-1.5 rounded-full bg-sky-400"></span>
              Mungesat
            </a>
            <a class="premium-nav-link">Porositë</a>
            <a class="premium-nav-link">Import</a>
            <a class="premium-nav-link">Settings</a>
          </nav>
        </div>
        <div class="flex items-center gap-3 rounded-2xl bg-white/10 border border-white/20 px-3 py-2.5">
          <div class="w-9 h-9 rounded-full bg-sky-200 text-sky-900 flex items-center justify-center text-sm font-semibold">P</div>
          <div class="text-xs">
            <div class="text-white font-medium">Punëtor</div>
            <div class="text-sky-100/80 text-[11px]">Worker</div>
          </div>
        </div>
      </aside>

      <main class="premium-main px-4 py-4 md:px-6 md:py-5">
        <header class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4 mb-4">
          <div class="flex items-center gap-3">
            ${logoSmall}
            <div>
              <p class="text-xs uppercase tracking-wide text-slate-500">Mungesat</p>
              <h1 class="text-lg md:text-xl font-semibold text-slate-900">Shto mungesa shpejt për sot</h1>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <button type="button" data-theme-toggle="1" class="theme-toggle-chip rounded-full px-2.5 py-1 text-[11px] font-semibold"></button>
            <button type="button" id="btn-signout" class="premium-btn-ghost inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs">
              ${iconLogout}
              Dil
            </button>
          </div>
        </header>

        <section class="grid gap-3 md:grid-cols-3 mb-4">
          <div class="premium-kpi p-3">
            <p class="text-[11px] uppercase tracking-wide text-sky-700">Status</p>
            <p id="worker-stat-total" class="mt-1 text-xl font-semibold text-slate-800">0</p>
            <p class="text-xs text-slate-500">Mungesa totale të regjistruara sot.</p>
          </div>
          <div class="premium-kpi p-3">
            <p class="text-[11px] uppercase tracking-wide text-emerald-700">Sinkronizim</p>
            <p id="worker-stat-products" class="mt-1 text-xl font-semibold text-slate-800">0</p>
            <p class="text-xs text-slate-500">Produkte aktive në kërkim për shtim.</p>
          </div>
          <div class="premium-kpi p-3">
            <p class="text-[11px] uppercase tracking-wide text-violet-700">Fokus</p>
            <p id="worker-stat-urgent" class="mt-1 text-xl font-semibold text-slate-800">0</p>
            <p class="text-xs text-slate-500">Raste të shënuara si urgjente.</p>
          </div>
        </section>

        <section class="grid gap-4 lg:grid-cols-[minmax(0,1.8fr)_minmax(0,1.1fr)]">
          <div class="premium-card p-5">
            <h2 class="text-base font-semibold text-slate-900 mb-1">Shto mungesë bari</h2>
            <p class="text-xs text-slate-500 mb-4">
              Kërko barin, zgjidhe nga lista dhe opsionalisht shëno URGJENT ose shto shënim.
            </p>
            <div class="space-y-3">
              <div>
                <label for="search-bar" class="block text-sm font-medium text-slate-700 mb-1">Kërko barin…</label>
                <input id="search-bar" type="text" placeholder="Shkruaj emrin e barit..." class="premium-input w-full rounded-lg px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none" />
              </div>
              <div class="flex flex-col sm:flex-row sm:items-center gap-2 text-sm text-slate-700">
                <label class="inline-flex items-center gap-2">
                  <input id="urgent-toggle" type="checkbox" class="h-4 w-4 rounded border-slate-300 bg-white text-red-500 focus:ring-sky-500" />
                  URGJENT
                </label>
                <input id="note-input" type="text" placeholder="Shënim (opsional)" class="premium-input flex-1 rounded-lg px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none" />
              </div>
              <div id="search-results" class="mt-2"></div>
            </div>
          </div>

          <div class="premium-card p-4">
            <h3 class="text-sm font-semibold text-slate-800 mb-2">Këshilla të shpejta</h3>
            <ul class="space-y-1 text-xs text-slate-600">
              <li>• Zgjidh barin nga lista për të shmangur gabimet.</li>
              <li>• Shëno URGJENT vetëm kur duhet dërgim i menjëhershëm.</li>
              <li>• Nëse e shton të njëjtin bar, sistemi rrit automatikisht added_count.</li>
            </ul>
            <div class="mt-3 grid gap-2">
              <div class="inline-flex items-center gap-2 text-[11px] text-slate-600 rounded-lg bg-white border border-slate-200 px-2 py-1.5">
                ${iconBolt}
                Ky panel është optimizuar për input të shpejtë.
              </div>
              <div class="inline-flex items-center gap-2 text-[11px] text-slate-600 rounded-lg bg-white border border-slate-200 px-2 py-1.5">
                ${iconClock}
                Mungesat ruhen me datën e sotme automatikisht.
              </div>
            </div>
          </div>
        </section>

        <section class="premium-card mt-4 p-5">
          <div class="flex items-center justify-between mb-2">
            <h2 class="text-base font-semibold text-slate-900">Mungesat e sotme</h2>
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

  const searchInput = document.getElementById('search-bar') as HTMLInputElement
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
    const q = searchInput.value.toLocaleLowerCase('sq-AL').trim()
    const matches = !q
      ? []
      : allProducts.filter((p) => {
          if (p.name.toLocaleLowerCase('sq-AL').includes(q)) return true
          return p.aliases.some((a) => a.toLocaleLowerCase('sq-AL').includes(q))
        }).slice(0, 8)
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
        urgentToggle.checked = false
        noteInput.value = ''
        resultsDiv.innerHTML = ''
        await refreshMissingList()

        showToast('Mungesa u shtua.')
      })
    })
  }

  searchInput.addEventListener('input', () => updateResults())
  getProducts().then((products) => {
    allProducts = products
    if (statProducts) statProducts.textContent = String(products.length)
  })
  refreshMissingList()
}
