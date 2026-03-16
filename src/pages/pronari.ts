import { signOut } from '../lib/auth.js'
import {
  addProduct,
  buildOrdersFromShortages,
  getProducts,
  getShortages,
  updateSuggestedQty,
  type MissingItem,
  type MockProduct,
  type OwnerOrder,
} from '../lib/mockData.js'

const logoSmall = `<svg class="w-8 h-8 text-pharm-primary shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19.5 12c0-1.2-.5-2.3-1.4-3.1l-2.1-2.1-2.1 2.1a4.5 4.5 0 01-6.4 0l-2.1-2.1-2.1 2.1A4.5 4.5 0 004.5 12a4.5 4.5 0 001.4 3.2l2.1 2.1 2.1-2.1a4.5 4.5 0 016.4 0l2.1 2.1 2.1-2.1a4.5 4.5 0 001.4-3.2z" /></svg>`
const iconLogout = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>`

export function renderPronari(container: HTMLElement): void {
  let shortages: MissingItem[] = getShortages()
  let products: MockProduct[] = getProducts()
  let searchQuery = ''
  let sortBy: 'supplier' | 'name' = 'supplier'
  let generatedOrders: OwnerOrder[] = buildOrdersFromShortages(shortages)

  function showToast(message: string): void {
    const existing = document.getElementById('owner-toast')
    if (existing) existing.remove()
    const toast = document.createElement('div')
    toast.id = 'owner-toast'
    toast.className =
      'fixed bottom-4 right-4 z-50 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-semibold text-white shadow-lg'
    toast.textContent = message
    document.body.appendChild(toast)
    window.setTimeout(() => toast.remove(), 1800)
  }

  function getFilteredRows(): MissingItem[] {
    const q = searchQuery.toLocaleLowerCase('sq-AL').trim()
    let rows = shortages.filter((s) => s.suggestedQty > 0)
    if (q) {
      rows = rows.filter((s) => s.product.name.toLocaleLowerCase('sq-AL').includes(q))
    }
    rows.sort((a, b) => {
      if (sortBy === 'name') return a.product.name.localeCompare(b.product.name, 'sq-AL')
      return (
        a.product.supplier.localeCompare(b.product.supplier, 'sq-AL') ||
        a.product.name.localeCompare(b.product.name, 'sq-AL')
      )
    })
    return rows
  }

  function buildReceipt(order: OwnerOrder): string {
    const date = new Date().toLocaleString('sq-AL')
    return `FARMACIA VALDET
POROSI MUNGESASH
Data: ${date}
Furnitori: ${order.supplier}
ID: #${order.id}
---------------------------
${order.items.join('\n')}

Shënim: Ju lutem konfirmoni disponueshmërinë dhe kohën e dorëzimit.`
  }

  function renderShortagesBody(): string {
    const rows = getFilteredRows()
    if (!rows.length) {
      return `<tr><td colspan="4" class="px-3 py-4 text-center text-slate-400">Nuk ka rezultate për këtë kërkim.</td></tr>`
    }
    return rows
      .map(
        (s) => `
      <tr class="border-t border-slate-700/60">
        <td class="px-3 py-2 text-slate-100 text-xs">${s.product.name}</td>
        <td class="px-3 py-2">
          <div class="inline-flex items-center rounded-full border border-slate-600 bg-slate-900/70 px-2 py-1 gap-1">
            <button data-action="decrement" data-id="${s.id}" class="text-slate-300 text-xs px-1 hover:text-white">-</button>
            <span class="w-6 text-center text-slate-100 text-xs">${s.suggestedQty}</span>
            <button data-action="increment" data-id="${s.id}" class="text-slate-300 text-xs px-1 hover:text-white">+</button>
          </div>
        </td>
        <td class="px-3 py-2 text-slate-200 text-xs">${s.product.supplier}</td>
        <td class="px-3 py-2">
          <div class="flex items-center gap-1">
            ${s.urgent ? '<span class="rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-semibold text-red-300">URGJENT</span>' : ''}
            ${s.note ? `<span class="text-[11px] text-slate-300">${s.note}</span>` : ''}
          </div>
        </td>
      </tr>`
      )
      .join('')
  }

  function renderOrdersPanel(): string {
    if (!generatedOrders.length) {
      return `<div class="text-xs text-slate-400">Nuk ka porosi për dërgim.</div>`
    }
    return generatedOrders
      .map(
        (o) => `
        <div class="rounded-xl border border-slate-700/70 bg-slate-900/80 px-3 py-2.5">
          <div class="flex items-center justify-between text-xs">
            <div>
              <span class="font-semibold text-sky-300">#${o.id}</span>
              <span class="ml-1 text-slate-200">${o.supplier}</span>
            </div>
            <button data-action="copy" data-order-id="${o.id}" class="rounded-lg bg-emerald-500/90 px-2 py-1 text-[11px] font-semibold text-white hover:bg-emerald-400">
              Kopjo reciptin
            </button>
          </div>
          <ul class="mt-1.5 space-y-0.5 text-[11px] text-slate-300">
            ${o.items.map((it) => `<li>• ${it}</li>`).join('')}
          </ul>
        </div>`
      )
      .join('')
  }

  function refreshUI(): void {
    const tableBody = document.getElementById('owner-shortage-body')
    const ordersList = document.getElementById('owner-orders-list')
    const productsList = document.getElementById('owner-products-list')
    if (tableBody) tableBody.innerHTML = renderShortagesBody()
    if (ordersList) ordersList.innerHTML = renderOrdersPanel()
    if (productsList) {
      productsList.innerHTML = products
        .slice(0, 8)
        .map(
          (p) =>
            `<li class="flex items-center justify-between gap-2 text-[11px] py-1 border-b border-slate-700/40">
              <span class="text-slate-200">${p.name}</span>
              <span class="text-slate-400">${p.supplier}</span>
            </li>`
        )
        .join('')
      const count = document.getElementById('owner-products-count')
      if (count) count.textContent = `${products.length}`
    }
  }

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
          <div class="w-9 h-9 rounded-full bg-sky-500/40 flex items-center justify-center text-sm font-semibold text-white">
            V
          </div>
          <div class="text-xs">
            <div class="text-slate-100 font-medium">Valdet Mulaj</div>
            <div class="text-slate-400 text-[11px]">Owner</div>
          </div>
        </div>
      </aside>

      <main class="flex-1 rounded-3xl bg-slate-900/70 border border-slate-700/70 backdrop-blur-md px-4 py-4 md:px-6 md:py-5">
        <header class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700/70 pb-4 mb-4">
          <div>
            <p class="text-xs uppercase tracking-wide text-slate-400">Mungesat</p>
            <h1 class="text-lg md:text-xl font-semibold text-slate-50">Mirë se vjen në Farmacia Valdet, Valdet!</h1>
          </div>
          <div class="flex items-center gap-2">
            <button type="button" class="hidden md:inline-flex items-center gap-2 rounded-xl border border-slate-600 px-3 py-2 text-xs text-slate-200 hover:bg-white/5">
              Import Excel
            </button>
            <button type="button" class="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-emerald-400">
              Gjenero porositë
            </button>
            <button type="button" id="btn-signout" class="inline-flex items-center gap-2 rounded-xl border border-slate-600 px-3 py-2 text-xs text-slate-200 hover:bg-white/5">
              ${iconLogout}
              Dil
            </button>
          </div>
        </header>

        <section class="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.25fr)]">
          <div class="rounded-2xl bg-slate-900/60 border border-slate-700/70 p-4 md:p-5">
            <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div>
                <h2 class="text-sm font-semibold text-slate-100">Mungesat për sot</h2>
                <p class="text-xs text-slate-400">Renditur sipas furnitorit</p>
              </div>
              <div class="flex items-center gap-2">
                <input id="owner-search" type="text" placeholder="Kërko barin..." class="w-40 md:w-56 rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500" />
                <select id="owner-sort" class="rounded-lg border border-slate-700 bg-slate-900/80 px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500">
                  <option value="supplier">Renditur sipas: Furnitorit</option>
                  <option value="name">Renditur sipas: Emrit</option>
                </select>
              </div>
            </div>
            <div class="overflow-hidden rounded-xl border border-slate-700/70 bg-slate-900/80">
              <table class="min-w-full text-xs">
                <thead class="bg-slate-800/80 text-slate-300">
                  <tr>
                    <th class="px-3 py-2 text-left font-medium">Barna</th>
                    <th class="px-3 py-2 text-left font-medium">Sasitë për porosi</th>
                    <th class="px-3 py-2 text-left font-medium">Furnitori</th>
                    <th class="px-3 py-2 text-left font-medium">Shënime</th>
                  </tr>
                </thead>
                <tbody id="owner-shortage-body">${renderShortagesBody()}</tbody>
              </table>
            </div>
            <p class="mt-2 text-[11px] text-slate-400 flex items-center gap-1">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              Sistemi sugjeron sasitë; ju mund t'i ndryshoni para se të gjeneroni porositë.
            </p>
          </div>

          <div class="space-y-3">
            <div class="rounded-2xl bg-slate-900/60 border border-slate-700/70 p-4">
              <div class="flex items-center justify-between mb-2">
                <h2 class="text-sm font-semibold text-slate-100">Porositë e fundit për dërgim</h2>
                <button data-action="show-all" class="text-[11px] text-sky-300 hover:underline">Shiko të gjitha</button>
              </div>
              <div id="owner-orders-list" class="space-y-2">${renderOrdersPanel()}</div>
            </div>
            <div class="rounded-2xl bg-slate-900/60 border border-slate-700/70 p-4">
              <div class="flex items-center justify-between mb-2">
                <h3 class="text-sm font-semibold text-slate-100">Menaxho barnat e farmacisë</h3>
                <span class="text-[11px] text-slate-400">Totali: <span id="owner-products-count">${products.length}</span></span>
              </div>
              <form id="owner-product-form" class="space-y-2 mb-2">
                <input id="owner-product-name" type="text" placeholder="Emri i barit" class="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-2.5 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500" />
                <div class="grid grid-cols-2 gap-2">
                  <input id="owner-product-supplier" type="text" placeholder="Furnitori" class="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-2.5 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500" />
                  <select id="owner-product-category" class="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500">
                    <option value="barna">Barna</option>
                    <option value="front">Front</option>
                  </select>
                </div>
                <input id="owner-product-aliases" type="text" placeholder="Aliases (opsional), ndarë me presje" class="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-2.5 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500" />
                <button type="submit" class="w-full rounded-lg bg-sky-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-400">
                  Shto bar të ri
                </button>
              </form>
              <ul id="owner-products-list" class="max-h-40 overflow-auto pr-1"></ul>
            </div>
            <div class="rounded-2xl bg-slate-900/60 border border-slate-700/70 p-3 text-[11px] text-slate-300">
              Tërheqja e porosive në WhatsApp dhe gjenerimi i reciptit do të lidhen më vonë me backend-in.
            </div>
          </div>
        </section>
      </main>
    </div>
  `

  document.getElementById('btn-signout')!.addEventListener('click', () => signOut())

  const searchInput = document.getElementById('owner-search') as HTMLInputElement | null
  const sortSelect = document.getElementById('owner-sort') as HTMLSelectElement | null
  const productForm = document.getElementById('owner-product-form') as HTMLFormElement | null
  const productNameInput = document.getElementById('owner-product-name') as HTMLInputElement | null
  const productSupplierInput = document.getElementById('owner-product-supplier') as HTMLInputElement | null
  const productCategoryInput = document.getElementById('owner-product-category') as HTMLSelectElement | null
  const productAliasesInput = document.getElementById('owner-product-aliases') as HTMLInputElement | null

  searchInput?.addEventListener('input', () => {
    searchQuery = searchInput.value
    refreshUI()
  })

  sortSelect?.addEventListener('change', () => {
    sortBy = sortSelect.value === 'name' ? 'name' : 'supplier'
    refreshUI()
  })

  productForm?.addEventListener('submit', (event) => {
    event.preventDefault()
    const name = productNameInput?.value ?? ''
    const supplier = productSupplierInput?.value ?? ''
    const category = (productCategoryInput?.value === 'front' ? 'front' : 'barna')
    const aliases = (productAliasesInput?.value ?? '')
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean)

    const result = addProduct({ name, supplier, category, aliases })
    if (!result.ok) {
      showToast(result.message)
      return
    }
    products = result.products
    productForm.reset()
    if (productCategoryInput) productCategoryInput.value = 'barna'
    refreshUI()
    showToast('Bari u shtua. Do të dalë edhe te punëtori.')
  })

  container.addEventListener('click', async (event) => {
    const target = event.target as HTMLElement
    const btn = target.closest<HTMLButtonElement>('button[data-action]')
    if (!btn) return

    const action = btn.dataset.action
    const id = btn.dataset.id

    if (action === 'increment' && id) {
      shortages = updateSuggestedQty(id, 1)
      refreshUI()
      return
    }

    if (action === 'decrement' && id) {
      shortages = updateSuggestedQty(id, -1)
      refreshUI()
      return
    }

    if (action === 'copy') {
      const orderId = Number(btn.dataset.orderId)
      const order = generatedOrders.find((o) => o.id === orderId)
      if (!order) return
      const text = buildReceipt(order)
      try {
        await navigator.clipboard.writeText(text)
        showToast('Recipti u kopjua!')
      } catch {
        showToast('Kopjimi dështoi.')
      }
      return
    }

    if (action === 'show-all') {
      showToast(`Gjithsej ${generatedOrders.length} porosi në listë.`)
      return
    }
  })

  const generateBtn = container.querySelector<HTMLButtonElement>('button.bg-emerald-500')
  generateBtn?.addEventListener('click', () => {
    generatedOrders = buildOrdersFromShortages(getFilteredRows())
    refreshUI()
    showToast('Porositë u gjeneruan sipas furnitorit.')
  })

  refreshUI()
}
