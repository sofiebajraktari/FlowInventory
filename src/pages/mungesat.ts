import { signOut } from '../lib/auth.js'
import type { UserRole } from '../types.js'

const logoSmall = `<svg class="w-8 h-8 text-pharm-primary shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19.5 12c0-1.2-.5-2.3-1.4-3.1l-2.1-2.1-2.1 2.1a4.5 4.5 0 01-6.4 0l-2.1-2.1-2.1 2.1A4.5 4.5 0 004.5 12a4.5 4.5 0 001.4 3.2l2.1 2.1 2.1-2.1a4.5 4.5 0 016.4 0l2.1 2.1 2.1-2.1a4.5 4.5 0 001.4-3.2z" /></svg>`
const iconLogout = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>`

type ProductCategory = 'barna' | 'front'

interface MockProduct {
  id: string
  name: string
  supplier: string
  category: ProductCategory
  aliases?: string[]
}

interface MissingItem {
  product: MockProduct
  urgent: boolean
  note: string
  addedCount: number
}

const MOCK_PRODUCTS: MockProduct[] = [
  { id: '1', name: 'AUGMENTIN 1g TAB 14', supplier: 'DONIKA', category: 'barna', aliases: ['augmentin', 'amoksiklav'] },
  { id: '2', name: 'BRUFEN 400mg TAB 20', supplier: 'ABCOM', category: 'barna', aliases: ['brufen', 'ibuprofen'] },
  { id: '3', name: 'PARACETAMOL 500mg TAB 10', supplier: 'ABCOM', category: 'barna', aliases: ['paracetamol', 'dafalgan'] },
  { id: '4', name: 'VITAMIN C 500mg', supplier: 'VITA', category: 'front', aliases: ['vit c'] },
]

let missingItems: MissingItem[] = []

function normalize(text: string): string {
  return text.toLocaleLowerCase('sq-AL').trim()
}

function searchProducts(query: string): MockProduct[] {
  const q = normalize(query)
  if (!q) return []
  return MOCK_PRODUCTS.filter((p) => {
    if (normalize(p.name).includes(q)) return true
    if (p.aliases?.some((a) => normalize(a).includes(q))) return true
    return false
  }).slice(0, 8)
}

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

function renderMissingList(): string {
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
  container.innerHTML = `
    <div class="mx-auto max-w-2xl">
      <header class="flex items-center justify-between gap-4 rounded-xl border border-pharm-border bg-pharm-card/80 px-4 py-3 backdrop-blur-sm">
        <div class="flex items-center gap-3">
          <a href="#/mungesat" class="flex items-center gap-2 text-white no-underline">
            ${logoSmall}
            <span class="font-bold text-lg tracking-tight">FlowInventory</span>
          </a>
          <span class="rounded-full bg-pharm-primary/20 px-2.5 py-0.5 text-xs font-medium text-pharm-muted">Punëtor</span>
        </div>
        <button type="button" id="btn-signout" class="flex items-center gap-2 rounded-lg border border-pharm-border px-3 py-2 text-sm text-slate-300 hover:bg-white/5 transition-colors">
          ${iconLogout}
          Dil
        </button>
      </header>
      <main class="mt-6 space-y-4">
        <section class="rounded-2xl border border-pharm-border bg-pharm-card/60 p-6 backdrop-blur-sm">
          <h2 class="text-lg font-semibold text-white mb-1">Shto mungesë bari</h2>
          <p class="text-sm text-slate-400 mb-4">Kërko barin, zgjidhe nga lista dhe opsionalisht shëno URGJENT ose shto shënim. Sasia vendoset më vonë nga pronari.</p>
          <div class="space-y-3">
            <div>
              <label for="search-bar" class="block text-sm font-medium text-slate-300 mb-1">Kërko barin…</label>
              <input id="search-bar" type="text" placeholder="Shkruaj emrin e barit..." class="w-full rounded-lg border border-slate-600 bg-pharm-bg/80 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-pharm-primary" />
            </div>
            <div class="flex items-center gap-3 text-sm text-slate-200">
              <label class="inline-flex items-center gap-2">
                <input id="urgent-toggle" type="checkbox" class="h-4 w-4 rounded border-slate-500 bg-pharm-bg text-red-400 focus:ring-pharm-primary" />
                URGJENT
              </label>
              <input id="note-input" type="text" placeholder="Shënim (opsional)" class="flex-1 rounded-lg border border-slate-600 bg-pharm-bg/80 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-pharm-primary" />
            </div>
            <div id="search-results" class="mt-2"></div>
          </div>
        </section>

        <section class="rounded-2xl border border-pharm-border bg-pharm-card/60 p-6 backdrop-blur-sm">
          <div class="flex items-center justify-between mb-2">
            <h2 class="text-lg font-semibold text-white">Mungesat e sotme</h2>
            <span class="text-xs text-slate-400">${new Date().toLocaleDateString('sq-AL')}</span>
          </div>
          <div id="missing-list">
            ${renderMissingList()}
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
  const pillWrap = document.getElementById('auth-pill-wrap')

  function updateResults() {
    const q = searchInput.value
    const matches = searchProducts(q)
    resultsDiv.innerHTML = renderResults(matches)

    const buttons = resultsDiv.querySelectorAll<HTMLButtonElement>('button.select-product')
    buttons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id
        const product = MOCK_PRODUCTS.find((p) => p.id === id)
        if (!product) return

        const existing = missingItems.find((m) => m.product.id === product.id)
        const incomingNote = noteInput.value.trim()
        const incomingUrgent = urgentToggle.checked

        if (existing) {
          existing.addedCount += 1
          existing.urgent = existing.urgent || incomingUrgent
          if (incomingNote) {
            existing.note = existing.note
              ? `${existing.note} | ${incomingNote}`
              : incomingNote
          }
        } else {
          missingItems.push({
            product,
            urgent: incomingUrgent,
            note: incomingNote,
            addedCount: 1,
          })
        }

        searchInput.value = ''
        urgentToggle.checked = false
        noteInput.value = ''
        resultsDiv.innerHTML = ''
        missingListDiv.innerHTML = renderMissingList()

        if (pillWrap) {
          pillWrap.classList.add('pill-go')
          setTimeout(() => pillWrap.classList.remove('pill-go'), 700)
        }
      })
    })
  }

  searchInput.addEventListener('input', () => updateResults())
}
