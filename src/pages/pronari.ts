import { signOut } from '../lib/auth.js'
import { isSupabaseConfigured, supabase } from '../lib/supabase.js'
import {
  addProduct,
  generateOrdersFromShortages,
  getProducts,
  getTodayShortages,
  updateSuggestedQty,
  type ProductView,
  type ShortageView,
  type OwnerOrder,
} from '../lib/data.js'

const iconLogout = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>`
const iconTrend = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 17l4-4 4 4 5-5M3 3v18h18" /></svg>`
const iconBox = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" /></svg>`

export function renderPronari(container: HTMLElement): void {
  let shortages: ShortageView[] = []
  let products: ProductView[] = []
  let searchQuery = ''
  let sortBy: 'supplier' | 'name' = 'supplier'
  let generatedOrders: OwnerOrder[] = []

  async function reloadShortages(): Promise<void> {
    shortages = await getTodayShortages()
    refreshUI()
  }

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

  function getFilteredRows(): ShortageView[] {
    const q = searchQuery.toLocaleLowerCase('sq-AL').trim()
    let rows = shortages.filter((s) => s.suggestedQty > 0)
    if (q) {
      rows = rows.filter((s) => s.productName.toLocaleLowerCase('sq-AL').includes(q))
    }
    rows.sort((a, b) => {
      if (sortBy === 'name') return a.productName.localeCompare(b.productName, 'sq-AL')
      return (
        a.supplierName.localeCompare(b.supplierName, 'sq-AL') ||
        a.productName.localeCompare(b.productName, 'sq-AL')
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
      return `<tr><td colspan="4" class="px-3 py-4 text-center text-slate-500">Nuk ka rezultate për këtë kërkim.</td></tr>`
    }
    return rows
      .map(
        (s) => `
      <tr class="border-t border-slate-200">
        <td class="px-3 py-2 text-slate-800 text-xs">${s.productName}</td>
        <td class="px-3 py-2">
          <div class="inline-flex items-center rounded-full border border-slate-300 bg-white px-2 py-1 gap-1">
            <button data-action="decrement" data-id="${s.id}" class="text-slate-600 text-xs px-1 hover:text-slate-900">-</button>
            <span class="w-6 text-center text-slate-800 text-xs">${s.suggestedQty}</span>
            <button data-action="increment" data-id="${s.id}" class="text-slate-600 text-xs px-1 hover:text-slate-900">+</button>
          </div>
        </td>
        <td class="px-3 py-2 text-slate-700 text-xs">${s.supplierName}</td>
        <td class="px-3 py-2">
          <div class="flex items-center gap-1">
            ${s.urgent ? '<span class="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700 border border-red-200">URGJENT</span>' : ''}
            ${s.note ? `<span class="text-[11px] text-slate-600">${s.note}</span>` : ''}
          </div>
        </td>
      </tr>`
      )
      .join('')
  }

  function renderOrdersPanel(): string {
    if (!generatedOrders.length) {
      return `<div class="text-xs text-slate-500">Nuk ka porosi për dërgim.</div>`
    }
    return generatedOrders
      .map(
        (o) => `
        <div class="rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
          <div class="flex items-center justify-between text-xs">
            <div>
              <span class="font-semibold text-sky-700">#${o.id}</span>
              <span class="ml-1 text-slate-700">${o.supplier}</span>
            </div>
            <button data-action="copy" data-order-id="${o.id}" class="rounded-lg bg-emerald-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-emerald-500">
              Kopjo reciptin
            </button>
          </div>
          <ul class="mt-1.5 space-y-0.5 text-[11px] text-slate-600">
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
              <span class="text-slate-700">${p.name}</span>
              <span class="text-slate-500">${p.supplierName}</span>
            </li>`
        )
        .join('')
      const count = document.getElementById('owner-products-count')
      if (count) count.textContent = `${products.length}`
    }
    const statShortages = document.getElementById('owner-stat-shortages')
    const statOrders = document.getElementById('owner-stat-orders')
    const statUrgent = document.getElementById('owner-stat-urgent')
    if (statShortages) statShortages.textContent = String(shortages.length)
    if (statOrders) statOrders.textContent = String(generatedOrders.length)
    if (statUrgent) statUrgent.textContent = String(shortages.filter((s) => s.urgent).length)
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
          <div class="w-9 h-9 rounded-full bg-sky-200 text-sky-900 flex items-center justify-center text-sm font-semibold">
            V
          </div>
          <div class="text-xs">
            <div class="text-white font-medium">Valdet Mulaj</div>
            <div class="text-sky-100/80 text-[11px]">Owner</div>
          </div>
        </div>
      </aside>

      <main class="premium-main px-4 py-4 md:px-6 md:py-5">
        <header class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4 mb-4">
          <div>
            <p class="text-xs uppercase tracking-wide text-slate-500">Mungesat</p>
            <h1 class="text-lg md:text-xl font-semibold text-slate-900">Mirë se vjen në Farmacia Valdet, Valdet!</h1>
          </div>
          <div class="flex items-center gap-2">
            <button type="button" data-theme-toggle="1" class="theme-toggle-chip rounded-full px-2.5 py-1 text-[11px] font-semibold"></button>
            <button type="button" class="premium-btn-ghost hidden md:inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs">
              Import Excel
            </button>
            <button type="button" id="btn-generate-orders" class="premium-btn-primary inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold">
              Gjenero porositë
            </button>
            <button type="button" id="btn-signout" class="premium-btn-ghost inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs">
              ${iconLogout}
              Dil
            </button>
          </div>
        </header>

        <section class="grid gap-3 md:grid-cols-3 mb-4">
          <div class="premium-kpi p-3">
            <p class="text-[11px] uppercase tracking-wide text-sky-700">Kontrolli</p>
            <p id="owner-stat-shortages" class="mt-1 text-xl font-semibold text-slate-800">0</p>
            <p class="text-xs text-slate-500">Mungesa aktive për sot.</p>
          </div>
          <div class="premium-kpi p-3">
            <p class="text-[11px] uppercase tracking-wide text-emerald-700">Efikasitet</p>
            <p id="owner-stat-orders" class="mt-1 text-xl font-semibold text-slate-800">0</p>
            <p class="text-xs text-slate-500">Porosi të gjeneruara në këtë sesion.</p>
          </div>
          <div class="premium-kpi p-3">
            <p class="text-[11px] uppercase tracking-wide text-violet-700">Gjurmim</p>
            <p id="owner-stat-urgent" class="mt-1 text-xl font-semibold text-slate-800">0</p>
            <p class="text-xs text-slate-500">Raste urgjente për veprim të shpejtë.</p>
          </div>
        </section>

        <section class="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.25fr)]">
          <div class="premium-card p-4 md:p-5">
            <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div>
                <h2 class="text-sm font-semibold text-slate-900">Mungesat për sot</h2>
                <p class="text-xs text-slate-500">Renditur sipas furnitorit</p>
              </div>
              <div class="flex items-center gap-2">
                <input id="owner-search" type="text" placeholder="Kërko barin..." class="premium-input w-40 md:w-56 rounded-lg px-3 py-1.5 text-xs placeholder:text-slate-400 focus:outline-none" />
                <select id="owner-sort" class="premium-input rounded-lg px-2.5 py-1.5 text-xs focus:outline-none">
                  <option value="supplier">Renditur sipas: Furnitorit</option>
                  <option value="name">Renditur sipas: Emrit</option>
                </select>
              </div>
            </div>
            <div class="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <table class="min-w-full text-xs">
                <thead class="bg-slate-100 text-slate-700">
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
            <p class="mt-2 text-[11px] text-slate-500 flex items-center gap-1">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              Sistemi sugjeron sasitë; ju mund t'i ndryshoni para se të gjeneroni porositë.
            </p>
            <div class="mt-3 flex flex-wrap gap-2">
              <span class="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] text-slate-600">
                ${iconTrend}
                Rrit produktivitetin e porosive
              </span>
              <span class="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] text-slate-600">
                ${iconBox}
                Menaxhim më i qartë i stokut
              </span>
            </div>
          </div>

          <div class="space-y-3">
            <div class="premium-card p-4">
              <div class="flex items-center justify-between mb-2">
                <h2 class="text-sm font-semibold text-slate-900">Porositë e fundit për dërgim</h2>
                <button data-action="show-all" class="text-[11px] text-sky-700 hover:underline">Shiko të gjitha</button>
              </div>
              <div id="owner-orders-list" class="space-y-2">${renderOrdersPanel()}</div>
            </div>
            <div class="premium-card p-4">
              <div class="flex items-center justify-between mb-2">
                <h3 class="text-sm font-semibold text-slate-900">Menaxho barnat e farmacisë</h3>
                <span class="text-[11px] text-slate-500">Totali: <span id="owner-products-count">${products.length}</span></span>
              </div>
              <form id="owner-product-form" class="space-y-2 mb-2">
                <input id="owner-product-name" type="text" placeholder="Emri i barit" class="premium-input w-full rounded-lg px-2.5 py-1.5 text-xs placeholder:text-slate-400 focus:outline-none" />
                <div class="grid grid-cols-2 gap-2">
                  <input id="owner-product-supplier" type="text" placeholder="Furnitori" class="premium-input w-full rounded-lg px-2.5 py-1.5 text-xs placeholder:text-slate-400 focus:outline-none" />
                  <select id="owner-product-category" class="premium-input w-full rounded-lg px-2.5 py-1.5 text-xs focus:outline-none">
                    <option value="barna">Barna</option>
                    <option value="front">Front</option>
                  </select>
                </div>
                <input id="owner-product-aliases" type="text" placeholder="Aliases (opsional), ndarë me presje" class="premium-input w-full rounded-lg px-2.5 py-1.5 text-xs placeholder:text-slate-400 focus:outline-none" />
                <button type="submit" class="premium-btn-primary w-full rounded-lg px-3 py-1.5 text-xs font-semibold">
                  Shto bar të ri
                </button>
              </form>
              <ul id="owner-products-list" class="max-h-40 overflow-auto pr-1"></ul>
            </div>
            <div class="premium-card bg-linear-to-r from-slate-50 to-sky-50 p-3 text-[11px] text-slate-600">
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

  productForm?.addEventListener('submit', async (event) => {
    event.preventDefault()
    const name = productNameInput?.value ?? ''
    const supplier = productSupplierInput?.value ?? ''
    const category = (productCategoryInput?.value === 'front' ? 'front' : 'barna')
    const aliases = (productAliasesInput?.value ?? '')
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean)

    const result = await addProduct({ name, supplier, category, aliases })
    if (!result.ok) {
      showToast(result.message)
      return
    }
    products = await getProducts()
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
      shortages = await updateSuggestedQty(id, 1)
      refreshUI()
      return
    }

    if (action === 'decrement' && id) {
      shortages = await updateSuggestedQty(id, -1)
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

  const generateBtn = document.getElementById('btn-generate-orders') as HTMLButtonElement | null
  generateBtn?.addEventListener('click', async () => {
    generatedOrders = await generateOrdersFromShortages(getFilteredRows())
    refreshUI()
    showToast('Porositë u gjeneruan sipas furnitorit.')
  })

  Promise.all([getTodayShortages(), getProducts()]).then(([rows, productRows]) => {
    shortages = rows
    products = productRows
    refreshUI()
  })

  if (isSupabaseConfigured) {
    const channel = supabase
      .channel(`owner-shortages-${Date.now()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'mungesat' },
        () => void reloadShortages()
      )
      .subscribe()

    window.addEventListener(
      'hashchange',
      () => {
        supabase.removeChannel(channel)
      },
      { once: true }
    )
  }
}
