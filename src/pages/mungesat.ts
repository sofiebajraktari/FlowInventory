import { signOut } from '../lib/auth.js'
import {
  addShortage,
  getShortages,
  searchProducts,
  type MissingItem,
  type MockProduct,
} from '../lib/mockData.js'

const logoSmall = `<svg class="w-8 h-8 text-pharm-primary shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19.5 12c0-1.2-.5-2.3-1.4-3.1l-2.1-2.1-2.1 2.1a4.5 4.5 0 01-6.4 0l-2.1-2.1-2.1 2.1A4.5 4.5 0 004.5 12a4.5 4.5 0 001.4 3.2l2.1 2.1 2.1-2.1a4.5 4.5 0 016.4 0l2.1 2.1 2.1-2.1a4.5 4.5 0 001.4-3.2z" /></svg>`
const iconLogout = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>`

function renderResults(results: MockProduct[]): string {
  if (!results.length) {
    return `<p class="text-sm text-slate-400">Nuk u gjet asnjë bar me këtë kërkim.</p>`
  }
  return `
    <ul class="mt-2 divide-y divide-slate-700/60">
      ${results
        .map(
          (p) => `
        <li>
          <button type="button" class="w-full text-left px-3 py-2 hover:bg-pharm-card/70 flex items-center justify-between gap-2 select-product" data-id="${p.id}">
            <div>
              <div class="text-sm text-slate-100">${p.name}</div>
              <div class="text-xs text-slate-400">Furnitori: ${p.supplier}</div>
            </div>
            <span class="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full border border-slate-500 text-slate-300">
              ${p.category === 'barna' ? 'Barna' : 'Front'}
            </span>
          </button>
        </li>`
        )
        .join('')}
    </ul>
  `
}

function renderMissingList(missingItems: MissingItem[]): string {
  if (!missingItems.length) {
    return `<p class="text-sm text-slate-500">Nuk ka mungesa të regjistruara për sot.</p>`
  }
  return `
    <ul class="space-y-2">
      ${missingItems
        .map(
          (m) => `
        <li class="flex items-start justify-between gap-3 rounded-lg border border-slate-700/70 bg-pharm-bg/60 px-3 py-2.5">
          <div>
            <div class="text-sm text-slate-100">${m.product.name}</div>
            <div class="text-xs text-slate-400">Furnitori: ${m.product.supplier}</div>
            ${
              m.note
                ? `<div class="mt-0.5 text-xs text-slate-300">Shënim: ${m.note}</div>`
                : ''
            }
          </div>
          <div class="flex flex-col items-end gap-1">
            <span class="rounded-full bg-slate-800/70 px-2 py-0.5 text-[11px] text-slate-200">Shtuar: x${m.addedCount}</span>
            ${m.urgent ? '<span class="rounded-full bg-red-500/20 px-2 py-0.5 text-[11px] text-red-300">URGJENT</span>' : ''}
          </div>
        </li>`
        )
        .join('')}
    </ul>
  `
}

export function renderMungesat(container: HTMLElement): void {
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

  const currentItems = getShortages()

  container.innerHTML = `
    <div class="min-h-[calc(100vh-2rem)] flex gap-4">
      <aside class="hidden md:flex w-60 flex-col justify-between rounded-3xl bg-gradient-to-b from-slate-900/90 to-slate-900/60 border border-slate-700/70 px-4 py-5">
        <div>
          <div class="flex items-center gap-2 mb-6">
            <div class="w-9 h-9 rounded-2xl bg-white flex items-center justify-center shadow">
              <div class="w-5 h-8 rounded-full bg-gradient-to-b from-sky-400 to-white"></div>
            </div>
            <span class="text-sm font-semibold text-slate-100">FlowInventory</span>
          </div>
          <nav class="space-y-1 text-sm">
            <a class="flex items-center gap-2 rounded-xl bg-sky-500/15 text-sky-200 px-3 py-2">
              <span class="w-1.5 h-1.5 rounded-full bg-sky-400"></span>
              Mungesat
            </a>
            <a class="flex items-center gap-2 rounded-xl text-slate-300 px-3 py-2 hover:bg-white/5">Porositë</a>
            <a class="flex items-center gap-2 rounded-xl text-slate-300 px-3 py-2 hover:bg-white/5">Import</a>
            <a class="flex items-center gap-2 rounded-xl text-slate-300 px-3 py-2 hover:bg-white/5">Settings</a>
          </nav>
        </div>
        <div class="flex items-center gap-3 rounded-2xl bg-slate-900/80 border border-slate-700 px-3 py-2.5">
          <div class="w-9 h-9 rounded-full bg-sky-500/40 flex items-center justify-center text-sm font-semibold text-white">P</div>
          <div class="text-xs">
            <div class="text-slate-100 font-medium">Punëtor</div>
            <div class="text-slate-400 text-[11px]">Worker</div>
          </div>
        </div>
      </aside>

      <main class="flex-1 rounded-3xl bg-slate-900/70 border border-slate-700/70 backdrop-blur-md px-4 py-4 md:px-6 md:py-5">
        <header class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700/70 pb-4 mb-4">
          <div class="flex items-center gap-3">
            ${logoSmall}
            <div>
              <p class="text-xs uppercase tracking-wide text-slate-400">Mungesat</p>
              <h1 class="text-lg md:text-xl font-semibold text-slate-50">Shto mungesa shpejt për sot</h1>
            </div>
          </div>
          <button type="button" id="btn-signout" class="inline-flex items-center gap-2 rounded-xl border border-slate-600 px-3 py-2 text-xs text-slate-200 hover:bg-white/5">
            ${iconLogout}
            Dil
          </button>
        </header>

        <section class="grid gap-4 lg:grid-cols-[minmax(0,1.8fr)_minmax(0,1.1fr)]">
          <div class="rounded-2xl border border-pharm-border bg-pharm-card/60 p-5">
            <h2 class="text-base font-semibold text-white mb-1">Shto mungesë bari</h2>
            <p class="text-xs text-slate-400 mb-4">
              Kërko barin, zgjidhe nga lista dhe opsionalisht shëno URGJENT ose shto shënim.
            </p>
            <div class="space-y-3">
              <div>
                <label for="search-bar" class="block text-sm font-medium text-slate-300 mb-1">Kërko barin…</label>
                <input id="search-bar" type="text" placeholder="Shkruaj emrin e barit..." class="w-full rounded-lg border border-slate-600 bg-pharm-bg/80 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-pharm-primary" />
              </div>
              <div class="flex flex-col sm:flex-row sm:items-center gap-2 text-sm text-slate-200">
                <label class="inline-flex items-center gap-2">
                  <input id="urgent-toggle" type="checkbox" class="h-4 w-4 rounded border-slate-500 bg-pharm-bg text-red-400 focus:ring-pharm-primary" />
                  URGJENT
                </label>
                <input id="note-input" type="text" placeholder="Shënim (opsional)" class="flex-1 rounded-lg border border-slate-600 bg-pharm-bg/80 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-pharm-primary" />
              </div>
              <div id="search-results" class="mt-2"></div>
            </div>
          </div>

          <div class="rounded-2xl border border-slate-700/70 bg-slate-900/70 p-4">
            <h3 class="text-sm font-semibold text-slate-100 mb-2">Këshilla të shpejta</h3>
            <ul class="space-y-1 text-xs text-slate-300">
              <li>• Zgjidh barin nga lista për të shmangur gabimet.</li>
              <li>• Shëno URGJENT vetëm kur duhet dërgim i menjëhershëm.</li>
              <li>• Nëse e shton të njëjtin bar, sistemi rrit automatikisht added_count.</li>
            </ul>
          </div>
        </section>

        <section class="mt-4 rounded-2xl border border-pharm-border bg-pharm-card/60 p-5">
          <div class="flex items-center justify-between mb-2">
            <h2 class="text-base font-semibold text-white">Mungesat e sotme</h2>
            <span class="text-xs text-slate-400">${new Date().toLocaleDateString('sq-AL')}</span>
          </div>
          <div id="missing-list">
            ${renderMissingList(currentItems)}
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

  function updateResults() {
    const q = searchInput.value
    const matches = searchProducts(q)
    resultsDiv.innerHTML = renderResults(matches)

    const buttons = resultsDiv.querySelectorAll<HTMLButtonElement>('button.select-product')
    buttons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id
        const incomingNote = noteInput.value.trim()
        const incomingUrgent = urgentToggle.checked

        if (!id) return
        const nextItems = addShortage(id, incomingUrgent, incomingNote)

        searchInput.value = ''
        urgentToggle.checked = false
        noteInput.value = ''
        resultsDiv.innerHTML = ''
        missingListDiv.innerHTML = renderMissingList(nextItems)

        showToast('Mungesa u shtua.')
      })
    })
  }

  searchInput.addEventListener('input', () => updateResults())
}
