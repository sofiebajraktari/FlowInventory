import { signOut } from '../lib/auth.js'
import { isSupabaseConfigured, supabase } from '../lib/supabase.js'
import { getProfile } from '../lib/auth.js'
import { getMockUser, setMockUser } from '../types.js'
import {
  addProduct,
  deleteShortage,
  generateOrdersFromShortages,
  getProducts,
  getTodayShortages,
  markOrderAsSent,
  updateShortageMeta,
  updateSuggestedQty,
  type ProductView,
  type ShortageView,
  type OwnerOrder,
} from '../lib/data.js'

const iconLogout = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>`
const iconTrend = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 17l4-4 4 4 5-5M3 3v18h18" /></svg>`
const iconBox = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" /></svg>`
type OwnerSection = 'dashboard' | 'mungesat' | 'porosite' | 'import' | 'settings'

export function renderPronari(container: HTMLElement, routeSection = 'dashboard'): void {
  const section: OwnerSection =
    routeSection === 'dashboard' ||
    routeSection === 'mungesat' ||
    routeSection === 'porosite' ||
    routeSection === 'import' ||
    routeSection === 'settings'
      ? routeSection
      : 'dashboard'
  const active = (key: OwnerSection): string => (section === key ? 'premium-nav-link active' : 'premium-nav-link')
  type ImportRow = {
    name: string
    supplier: string
    category: 'barna' | 'front'
    aliases: string[]
  }

  let shortages: ShortageView[] = []
  let products: ProductView[] = []
  let searchQuery = ''
  let sortBy: 'supplier' | 'name' = 'supplier'
  let generatedOrders: OwnerOrder[] = []
  let accountInfo: {
    firstName: string
    lastName: string
    email: string
    role: string
    userId: string
    provider: string
    sessionMode: string
  } = {
    firstName: 'Valdet',
    lastName: 'Mulaj',
    email: '—',
    role: 'OWNER',
    userId: '—',
    provider: 'email',
    sessionMode: isSupabaseConfigured ? 'Supabase' : 'Demo',
  }

  async function reloadShortages(): Promise<void> {
    shortages = await getTodayShortages()
    refreshUI()
  }

  async function loadAccountInfo(): Promise<void> {
    if (!isSupabaseConfigured) {
      const mock = getMockUser()
      accountInfo = {
        firstName: mock?.firstName ?? 'Demo',
        lastName: mock?.lastName ?? 'Owner',
        email: mock?.email ?? 'demo@flowinventory.local',
        role: mock?.role ?? 'OWNER',
        userId: 'demo-user',
        provider: 'demo',
        sessionMode: 'Demo',
      }
      return
    }

    const [{ data: userData }, profile] = await Promise.all([
      supabase.auth.getUser(),
      getProfile(),
    ])
    const user = userData.user
    const provider = user?.app_metadata?.provider ?? user?.identities?.[0]?.provider ?? 'email'
    accountInfo = {
      firstName: String(user?.user_metadata?.first_name ?? 'Valdet'),
      lastName: String(user?.user_metadata?.last_name ?? 'Mulaj'),
      email: user?.email ?? '—',
      role: profile?.role ?? 'OWNER',
      userId: user?.id ?? '—',
      provider: String(provider),
      sessionMode: 'Supabase',
    }
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

  function normalizeHeader(value: string): string {
    return value
      .toLocaleLowerCase('sq-AL')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '')
  }

  function pickByKeys(row: Record<string, unknown>, keys: string[]): string {
    for (const [k, v] of Object.entries(row)) {
      if (keys.includes(normalizeHeader(k))) return String(v ?? '').trim()
    }
    return ''
  }

  function parseCategory(raw: string): 'barna' | 'front' {
    return raw.trim().toLocaleLowerCase('sq-AL') === 'front' ? 'front' : 'barna'
  }

  function openShortageEditModal(initial: ShortageView): Promise<{
    suggestedQty: number
    urgent: boolean
    note: string
  } | null> {
    return new Promise((resolve) => {
      const overlay = document.createElement('div')
      overlay.className = 'fixed inset-0 z-[70] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4'
      overlay.innerHTML = `
        <div class="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
          <h3 class="text-lg font-semibold text-slate-900 mb-1">Përditëso mungesën</h3>
          <p class="text-sm text-slate-500 mb-4">Ndrysho të dhënat për <strong>${initial.productName}</strong>.</p>
          <div class="grid gap-3 md:grid-cols-2">
            <label class="text-sm text-slate-700">
              Sasia për porosi
              <input id="owner-edit-qty" type="number" min="1" value="${initial.suggestedQty}" class="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500" />
            </label>
            <label class="text-sm text-slate-700 flex items-end">
              <span class="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2">
                <input id="owner-edit-urgent" type="checkbox" ${initial.urgent ? 'checked' : ''} class="h-4 w-4 rounded border-slate-300 text-red-600 focus:ring-sky-500" />
                URGJENT
              </span>
            </label>
          </div>
          <label class="mt-3 block text-sm text-slate-700">
            Shënimi
            <textarea id="owner-edit-note" class="mt-1 w-full min-h-48 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500" placeholder="Shkruaj shënimin...">${initial.note ?? ''}</textarea>
          </label>
          <div class="mt-4 flex items-center justify-end gap-2">
            <button type="button" id="owner-edit-cancel" class="premium-btn-ghost rounded-xl px-4 py-2 text-sm font-medium">Anulo</button>
            <button type="button" id="owner-edit-save" class="premium-btn-primary rounded-xl px-4 py-2 text-sm font-semibold">Ruaj ndryshimet</button>
          </div>
        </div>
      `
      document.body.appendChild(overlay)

      const qtyInput = overlay.querySelector<HTMLInputElement>('#owner-edit-qty')
      const urgentInput = overlay.querySelector<HTMLInputElement>('#owner-edit-urgent')
      const noteInput = overlay.querySelector<HTMLTextAreaElement>('#owner-edit-note')
      const cancelBtn = overlay.querySelector<HTMLButtonElement>('#owner-edit-cancel')
      const saveBtn = overlay.querySelector<HTMLButtonElement>('#owner-edit-save')
      qtyInput?.focus()

      const close = (value: { suggestedQty: number; urgent: boolean; note: string } | null) => {
        overlay.remove()
        resolve(value)
      }

      cancelBtn?.addEventListener('click', () => close(null))
      saveBtn?.addEventListener('click', () => {
        const qty = Math.max(1, Number(qtyInput?.value ?? 1) || 1)
        close({
          suggestedQty: qty,
          urgent: Boolean(urgentInput?.checked),
          note: noteInput?.value ?? '',
        })
      })
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) close(null)
      })
    })
  }

  function openConfirmModal(title: string, description: string): Promise<boolean> {
    return new Promise((resolve) => {
      const overlay = document.createElement('div')
      overlay.className = 'fixed inset-0 z-[70] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4'
      overlay.innerHTML = `
        <div class="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
          <h3 class="text-lg font-semibold text-slate-900 mb-1">${title}</h3>
          <p class="text-sm text-slate-600 mb-5">${description}</p>
          <div class="flex items-center justify-end gap-2">
            <button type="button" id="owner-confirm-cancel" class="premium-btn-ghost rounded-xl px-4 py-2 text-sm font-medium">Anulo</button>
            <button type="button" id="owner-confirm-ok" class="rounded-xl border border-red-200 bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500">Vazhdo</button>
          </div>
        </div>
      `
      document.body.appendChild(overlay)

      const close = (value: boolean) => {
        overlay.remove()
        resolve(value)
      }

      overlay.querySelector<HTMLButtonElement>('#owner-confirm-cancel')?.addEventListener('click', () => close(false))
      overlay.querySelector<HTMLButtonElement>('#owner-confirm-ok')?.addEventListener('click', () => close(true))
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) close(false)
      })
    })
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

  async function downloadOrderPdf(order: OwnerOrder): Promise<void> {
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF({ unit: 'mm', format: 'a4' })
    const receiptText = buildReceipt(order)
    const lines = doc.splitTextToSize(receiptText, 180)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(12)
    doc.text(lines, 15, 20)
    const safeSupplier = order.supplier.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '')
    doc.save(`porosia-${order.id}-${safeSupplier || 'furnitor'}.pdf`)
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
        <td class="px-3 py-2">
          <div class="flex items-center gap-2">
            <div class="h-7 w-7 rounded-full bg-sky-100 border border-sky-200 flex items-center justify-center text-[10px] font-semibold text-sky-700">
              ${s.productName.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div class="text-slate-800 text-xs font-medium">${s.productName}</div>
              <div class="text-[10px] text-slate-500">${s.supplierName}</div>
            </div>
          </div>
        </td>
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
            <span class="rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
              s.urgent
                ? 'bg-red-100 text-red-700 border-red-200'
                : 'bg-slate-100 text-slate-600 border-slate-200'
            }">
              ${s.urgent ? 'URGJENT' : 'Normal'}
            </span>
            ${s.note ? `<span class="text-[11px] text-slate-600">${s.note}</span>` : ''}
            <button data-action="edit-note" data-id="${s.id}" title="Ndrysho mungesën" class="rounded-lg border border-slate-300 bg-white px-2 py-1 text-[16px] leading-none text-black hover:bg-slate-50">✎</button>
            <button data-action="delete-shortage" data-id="${s.id}" title="Fshi mungesën" class="rounded-lg border border-slate-300 bg-white px-2 py-1 text-[16px] leading-none text-black hover:bg-red-50">✖</button>
          </div>
        </td>
        <td class="px-3 py-2 text-right">
          <button data-action="copy-shortage-name" data-id="${s.id}" class="text-[10px] text-slate-500 hover:text-slate-800">⋯</button>
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
            <div class="flex items-center gap-1">
              <button data-action="copy" data-order-id="${o.id}" class="rounded-lg bg-emerald-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-emerald-500">
                Kopjo reciptin
              </button>
              <button data-action="download-pdf" data-order-id="${o.id}" class="rounded-lg border border-sky-300 bg-sky-50 px-2 py-1 text-[11px] font-semibold text-sky-700 hover:bg-sky-100">
                Shkarko PDF
              </button>
              <button data-action="mark-sent" data-order-id="${o.id}" class="rounded-lg border border-slate-300 px-2 py-1 text-[11px] font-semibold ${
                o.status === 'SENT' ? 'text-emerald-700 bg-emerald-50' : 'text-slate-700 bg-white hover:bg-slate-50'
              }">
                ${o.status === 'SENT' ? 'Dërguar' : 'Shëno dërguar'}
              </button>
            </div>
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
    const countTop = document.getElementById('owner-products-count-top')
    if (countTop) countTop.textContent = `${products.length}`
    const statShortages = document.getElementById('owner-stat-shortages')
    const statOrders = document.getElementById('owner-stat-orders')
    const statUrgent = document.getElementById('owner-stat-urgent')
    if (statShortages) statShortages.textContent = String(shortages.length)
    if (statOrders) statOrders.textContent = String(generatedOrders.length)
    if (statUrgent) statUrgent.textContent = String(shortages.filter((s) => s.urgent).length)

    const accName = document.getElementById('owner-settings-name')
    const accEmail = document.getElementById('owner-settings-email')
    const accRole = document.getElementById('owner-settings-role')
    const accId = document.getElementById('owner-settings-userid')
    const accProvider = document.getElementById('owner-settings-provider')
    const accMode = document.getElementById('owner-settings-mode')
    if (accName) accName.textContent = `${accountInfo.firstName} ${accountInfo.lastName}`.trim()
    if (accEmail) accEmail.textContent = accountInfo.email
    if (accRole) accRole.textContent = accountInfo.role
    if (accId) accId.textContent = accountInfo.userId
    if (accProvider) accProvider.textContent = accountInfo.provider
    if (accMode) accMode.textContent = accountInfo.sessionMode
    const accountInputFirst = document.getElementById('owner-settings-firstname') as HTMLInputElement | null
    const accountInputLast = document.getElementById('owner-settings-lastname') as HTMLInputElement | null
    const accountInputEmail = document.getElementById('owner-settings-email-input') as HTMLInputElement | null
    if (accountInputFirst && document.activeElement !== accountInputFirst) accountInputFirst.value = accountInfo.firstName
    if (accountInputLast && document.activeElement !== accountInputLast) accountInputLast.value = accountInfo.lastName
    if (accountInputEmail && document.activeElement !== accountInputEmail) accountInputEmail.value = accountInfo.email
    const sidebarAvatar = document.getElementById('owner-sidebar-avatar')
    const sidebarName = document.getElementById('owner-sidebar-name')
    const menuAvatar = document.getElementById('owner-menu-avatar')
    if (sidebarAvatar) sidebarAvatar.textContent = (accountInfo.firstName || 'O').slice(0, 1).toUpperCase()
    if (menuAvatar) menuAvatar.textContent = (accountInfo.firstName || 'O').slice(0, 1).toUpperCase()
    if (sidebarName) sidebarName.textContent = `${accountInfo.firstName} ${accountInfo.lastName}`.trim()

    const supplierList = document.getElementById('owner-dashboard-suppliers')
    if (supplierList) {
      const bySupplier = new Map<string, number>()
      shortages.forEach((s) => bySupplier.set(s.supplierName, (bySupplier.get(s.supplierName) ?? 0) + 1))
      const entries = [...bySupplier.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6)
      supplierList.innerHTML = entries.length
        ? entries
            .map(
              ([name, count]) => `
          <li class="space-y-1">
            <div class="flex items-center justify-between text-xs text-slate-700">
              <span class="truncate">${name}</span>
              <span class="font-semibold">${count}</span>
            </div>
            <div class="h-1.5 rounded-full bg-slate-200 overflow-hidden">
              <div class="h-full bg-sky-500" style="width:${Math.min(100, count * 12)}%"></div>
            </div>
          </li>`
            )
            .join('')
        : '<li class="text-xs text-slate-500">Nuk ka të dhëna ende.</li>'
    }

    const urgent = shortages.filter((s) => s.urgent).length
    const urgentRate = shortages.length ? Math.round((urgent / shortages.length) * 100) : 0
    const coverageRate = products.length
      ? Math.round((new Set(shortages.map((s) => s.productId)).size / products.length) * 100)
      : 0

    const urgentText = document.getElementById('owner-db-urgent-rate')
    const urgentBar = document.getElementById('owner-db-urgent-bar') as HTMLDivElement | null
    if (urgentText) urgentText.textContent = `${urgentRate}%`
    if (urgentBar) urgentBar.style.width = `${urgentRate}%`

    const coverageText = document.getElementById('owner-db-coverage-rate')
    const coverageBar = document.getElementById('owner-db-coverage-bar') as HTMLDivElement | null
    if (coverageText) coverageText.textContent = `${coverageRate}%`
    if (coverageBar) coverageBar.style.width = `${coverageRate}%`
  }

  container.innerHTML = `
    <div class="min-h-[calc(100vh-2rem)] flex gap-4">
      <aside class="hidden md:flex w-64 flex-col justify-between rounded-3xl border border-sky-100 bg-linear-to-b from-cyan-50 to-sky-100 px-4 py-5 shadow-sm">
        <div>
          <div class="flex items-center gap-2 mb-6">
            <div class="w-9 h-9 rounded-2xl bg-white flex items-center justify-center shadow">
              <img src="/brand/flowguard/logo.png" alt="FlowGuard logo" class="w-7 h-7 rounded-full object-cover" />
            </div>
            <span class="text-sm font-semibold text-slate-900">FlowInventory</span>
          </div>
          <nav class="space-y-1 text-sm">
            <a href="#/pronari/dashboard" class="${active('dashboard')}">
              <span class="w-1.5 h-1.5 rounded-full bg-sky-400"></span>
              Dashboard
            </a>
            <a href="#/pronari/mungesat" class="${active('mungesat')}">
              <span class="w-1.5 h-1.5 rounded-full bg-sky-400"></span>
              Mungesat
            </a>
            <a href="#/pronari/porosite" class="${active('porosite')}">Porositë</a>
            <a href="#/pronari/import" class="${active('import')}">Import</a>
            <a href="#/pronari/settings" class="${active('settings')}">Settings</a>
          </nav>
        </div>
        <div class="flex items-center gap-3 rounded-2xl bg-white/90 border border-sky-100 px-3 py-2.5 shadow-sm">
          <div id="owner-sidebar-avatar" class="w-9 h-9 rounded-full bg-sky-200 text-sky-900 flex items-center justify-center text-sm font-semibold">
            V
          </div>
          <div class="text-xs">
            <div id="owner-sidebar-name" class="text-slate-900 font-medium">Valdet Mulaj</div>
            <div class="text-slate-500 text-[11px]">Owner</div>
          </div>
        </div>
      </aside>

      <main class="flex-1 rounded-3xl border border-slate-200 bg-white px-4 py-4 md:px-6 md:py-5 shadow-sm">
        <header class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4 mb-4">
          <div>
            <p class="text-xs uppercase tracking-wide text-slate-500">${section === 'dashboard' ? 'Dashboard' : section === 'mungesat' ? 'Mungesat' : section === 'porosite' ? 'Porositë' : section === 'import' ? 'Import' : 'Settings'}</p>
            <h1 class="text-lg md:text-xl font-semibold text-slate-900">${
              section === 'dashboard'
                ? 'Pamje e përgjithshme me grafika'
                : section === 'mungesat'
                ? 'Mirë se vjen në Farmacia Valdet, Valdet!'
                : section === 'porosite'
                  ? 'Menaxho porositë e gjeneruara'
                  : section === 'import'
                    ? 'Importo dhe menaxho produktet'
                    : 'Konfigurimet e panelit të pronarit'
            }</h1>
          </div>
          <div class="flex items-center gap-2">
            <button type="button" data-theme-toggle="1" class="theme-toggle-chip rounded-full px-2.5 py-1 text-[11px] font-semibold"></button>
            <button type="button" id="btn-import-csv" class="${section === 'import' ? 'premium-btn-ghost' : 'hidden'} md:inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs">
              Import Excel
            </button>
            <input id="import-csv-input" type="file" accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" class="hidden" />
            <button type="button" id="btn-generate-orders" class="${section === 'porosite' ? 'premium-btn-primary inline-flex' : 'hidden'} items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold">
              Gjenero porositë
            </button>
            <div class="relative">
              <button type="button" id="owner-account-menu-btn" class="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-700 hover:bg-slate-50">
                <span id="owner-menu-avatar" class="h-7 w-7 rounded-full bg-sky-200 text-sky-900 flex items-center justify-center text-xs font-semibold">V</span>
                <span class="text-slate-500">⋯</span>
              </button>
              <div id="owner-account-menu" class="hidden absolute right-0 mt-2 w-48 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl z-50">
                <button type="button" id="owner-account-go-settings" class="w-full text-left rounded-lg px-2.5 py-2 text-xs text-slate-700 hover:bg-slate-100">
                  ⚙️ Settings
                </button>
                <button type="button" id="owner-account-logout" class="w-full text-left rounded-lg px-2.5 py-2 text-xs text-red-700 hover:bg-red-50">
                  ⎋ Dil nga account
                </button>
              </div>
            </div>
          </div>
        </header>

        <section class="${section === 'settings' ? 'hidden ' : ''}grid gap-3 md:grid-cols-4 mb-4">
          <div class="rounded-2xl border border-[#b9e7b6] bg-linear-to-br from-[#ddf7da] to-[#f1fdea] p-3 shadow-sm">
            <p class="text-[11px] uppercase tracking-wide text-[#22624a]">Kontrolli</p>
            <p id="owner-stat-shortages" class="mt-1 text-xl font-semibold text-slate-800">0</p>
            <p class="text-xs text-slate-500">Mungesa aktive për sot.</p>
          </div>
          <div class="rounded-2xl border border-[#b8dfea] bg-linear-to-br from-[#dff3fb] to-[#eff9ff] p-3 shadow-sm">
            <p class="text-[11px] uppercase tracking-wide text-[#1e5e78]">Efikasitet</p>
            <p id="owner-stat-orders" class="mt-1 text-xl font-semibold text-slate-800">0</p>
            <p class="text-xs text-slate-500">Porosi të gjeneruara në këtë sesion.</p>
          </div>
          <div class="rounded-2xl border border-[#f0bfd0] bg-linear-to-br from-[#f9dbe6] to-[#fff2f7] p-3 shadow-sm">
            <p class="text-[11px] uppercase tracking-wide text-[#7c3454]">Gjurmim</p>
            <p id="owner-stat-urgent" class="mt-1 text-xl font-semibold text-slate-800">0</p>
            <p class="text-xs text-slate-500">Raste urgjente për veprim të shpejtë.</p>
          </div>
          <div class="rounded-2xl border border-[#cfc5fb] bg-linear-to-br from-[#e7e0ff] to-[#f4f0ff] p-3 shadow-sm">
            <p class="text-[11px] uppercase tracking-wide text-[#4e3f8f]">Produktet</p>
            <p id="owner-products-count-top" class="mt-1 text-xl font-semibold text-slate-800">0</p>
            <p class="text-xs text-slate-500">Barna të regjistruara në sistem.</p>
          </div>
        </section>

        <section class="${section === 'dashboard' ? '' : 'hidden '}grid gap-4 md:grid-cols-2 mb-4">
          <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 class="text-sm font-semibold text-slate-900 mb-3">Graph report: mungesat sipas furnitorit</h3>
            <ul id="owner-dashboard-suppliers" class="space-y-2"></ul>
          </div>
          <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 class="text-sm font-semibold text-slate-900 mb-3">Total shortages overview</h3>
            <div class="space-y-3">
              <div>
                <div class="flex items-center justify-between text-xs text-slate-600 mb-1">
                  <span>Norma urgjente</span>
                  <strong id="owner-db-urgent-rate" class="text-slate-900">0%</strong>
                </div>
                <div class="h-2 rounded-full bg-slate-200 overflow-hidden">
                  <div id="owner-db-urgent-bar" class="h-full bg-red-500" style="width:0%"></div>
                </div>
              </div>
              <div>
                <div class="flex items-center justify-between text-xs text-slate-600 mb-1">
                  <span>Mbulim i produkteve</span>
                  <strong id="owner-db-coverage-rate" class="text-slate-900">0%</strong>
                </div>
                <div class="h-2 rounded-full bg-slate-200 overflow-hidden">
                  <div id="owner-db-coverage-bar" class="h-full bg-sky-500" style="width:0%"></div>
                </div>
              </div>
              <div class="grid grid-cols-2 gap-2 pt-2">
                <a href="#/pronari/mungesat" class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100">Hap Mungesat</a>
                <a href="#/pronari/porosite" class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100">Hap Porositë</a>
                <a href="#/pronari/import" class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100">Hap Import</a>
                <a href="#/pronari/settings" class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100">Hap Settings</a>
              </div>
            </div>
          </div>
        </section>

        <section class="${section === 'settings' || section === 'porosite' || section === 'import' ? 'hidden ' : ''}grid gap-4">
          <div class="${section === 'mungesat' || section === 'dashboard' ? '' : 'hidden '}premium-card p-4 md:p-5">
            <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div>
                <h2 class="text-sm font-semibold text-slate-900">${section === 'dashboard' ? 'Mungesat e fundit' : 'Mungesat për sot'}</h2>
                <p class="text-xs text-slate-500">${section === 'dashboard' ? 'Pamje e shpejtë e mungesave aktive' : 'Renditur sipas furnitorit'}</p>
              </div>
              <div class="flex items-center gap-2 ${section === 'dashboard' ? 'hidden' : ''}">
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
                    <th class="px-3 py-2 text-right font-medium">Veprime</th>
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

          <div class="${section === 'dashboard' ? '' : 'hidden '}space-y-3">
            <div class="${section === 'porosite' || section === 'dashboard' ? '' : 'hidden '}premium-card p-4">
              <div class="flex items-center justify-between mb-2">
                <h2 class="text-sm font-semibold text-slate-900">Porositë e fundit për dërgim</h2>
                <button data-action="show-all" class="text-[11px] text-sky-700 hover:underline">Shiko të gjitha</button>
              </div>
              <div id="owner-orders-list" class="space-y-2">${renderOrdersPanel()}</div>
            </div>
            <div class="${section === 'import' ? '' : 'hidden '}premium-card p-4">
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
            <div class="${section === 'settings' ? 'hidden ' : ''}premium-card bg-linear-to-r from-slate-50 to-sky-50 p-3 text-[11px] text-slate-600">
              Tërheqja e porosive në WhatsApp dhe gjenerimi i reciptit do të lidhen më vonë me backend-in.
            </div>
          </div>
        </section>

        <section class="${section === 'settings' ? '' : 'hidden '}premium-card p-6">
          <h2 class="text-lg font-semibold text-slate-900 mb-2">Settings</h2>
          <p class="text-sm text-slate-600 mb-4">
            Të dhënat e llogarisë aktive në këtë pajisje.
          </p>
          <div class="grid gap-3 md:grid-cols-2">
            <div class="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p class="text-[11px] uppercase tracking-wide text-slate-500">Emri i plotë</p>
              <p id="owner-settings-name" class="text-sm font-semibold text-slate-900">—</p>
            </div>
            <div class="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p class="text-[11px] uppercase tracking-wide text-slate-500">Email</p>
              <p id="owner-settings-email" class="text-sm font-semibold text-slate-900">—</p>
            </div>
            <div class="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p class="text-[11px] uppercase tracking-wide text-slate-500">Roli</p>
              <p id="owner-settings-role" class="text-sm font-semibold text-slate-900">—</p>
            </div>
            <div class="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p class="text-[11px] uppercase tracking-wide text-slate-500">User ID</p>
              <p id="owner-settings-userid" class="text-xs font-semibold text-slate-900 break-all">—</p>
            </div>
            <div class="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p class="text-[11px] uppercase tracking-wide text-slate-500">Auth Provider</p>
              <p id="owner-settings-provider" class="text-sm font-semibold text-slate-900">—</p>
            </div>
            <div class="rounded-xl border border-slate-200 bg-slate-50 p-3 md:col-span-2">
              <p class="text-[11px] uppercase tracking-wide text-slate-500">Session Mode</p>
              <p id="owner-settings-mode" class="text-sm font-semibold text-slate-900">—</p>
            </div>
          </div>
          <form id="owner-account-form" class="mt-4 grid gap-3 md:grid-cols-2">
            <label class="text-sm text-slate-700">
              Emri
              <input id="owner-settings-firstname" type="text" class="premium-input mt-1 w-full rounded-xl px-3 py-2 text-sm focus:outline-none" />
            </label>
            <label class="text-sm text-slate-700">
              Mbiemri
              <input id="owner-settings-lastname" type="text" class="premium-input mt-1 w-full rounded-xl px-3 py-2 text-sm focus:outline-none" />
            </label>
            <label class="text-sm text-slate-700 md:col-span-2">
              Email
              <input id="owner-settings-email-input" type="email" class="premium-input mt-1 w-full rounded-xl px-3 py-2 text-sm focus:outline-none" />
            </label>
            <div class="md:col-span-2 flex justify-end">
              <button type="submit" class="premium-btn-primary rounded-xl px-4 py-2 text-sm font-semibold">
                Ruaj account
              </button>
            </div>
          </form>
          <div class="mt-4 flex justify-end">
            <button type="button" id="btn-signout" class="premium-btn-ghost inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm">
              ${iconLogout}
              Dil nga account
            </button>
          </div>
        </section>
      </main>
    </div>
  `

  const signoutBtn = document.getElementById('btn-signout') as HTMLButtonElement | null
  signoutBtn?.addEventListener('click', () => signOut())
  const accountMenuBtn = document.getElementById('owner-account-menu-btn') as HTMLButtonElement | null
  const accountMenu = document.getElementById('owner-account-menu') as HTMLDivElement | null
  const accountGoSettings = document.getElementById('owner-account-go-settings') as HTMLButtonElement | null
  const accountLogout = document.getElementById('owner-account-logout') as HTMLButtonElement | null
  accountMenuBtn?.addEventListener('click', (e) => {
    e.stopPropagation()
    accountMenu?.classList.toggle('hidden')
  })
  accountGoSettings?.addEventListener('click', () => {
    window.location.hash = '#/pronari/settings'
  })
  accountLogout?.addEventListener('click', () => signOut())
  document.addEventListener('click', (e) => {
    if (!accountMenu || !accountMenuBtn) return
    const target = e.target as Node
    if (!accountMenu.contains(target) && !accountMenuBtn.contains(target)) {
      accountMenu.classList.add('hidden')
    }
  })

  const searchInput = document.getElementById('owner-search') as HTMLInputElement | null
  const sortSelect = document.getElementById('owner-sort') as HTMLSelectElement | null
  const productForm = document.getElementById('owner-product-form') as HTMLFormElement | null
  const productNameInput = document.getElementById('owner-product-name') as HTMLInputElement | null
  const productSupplierInput = document.getElementById('owner-product-supplier') as HTMLInputElement | null
  const productCategoryInput = document.getElementById('owner-product-category') as HTMLSelectElement | null
  const productAliasesInput = document.getElementById('owner-product-aliases') as HTMLInputElement | null
  const importBtn = document.getElementById('btn-import-csv') as HTMLButtonElement | null
  const importInput = document.getElementById('import-csv-input') as HTMLInputElement | null
  const accountForm = document.getElementById('owner-account-form') as HTMLFormElement | null
  const firstNameInput = document.getElementById('owner-settings-firstname') as HTMLInputElement | null
  const lastNameInput = document.getElementById('owner-settings-lastname') as HTMLInputElement | null
  const emailInput = document.getElementById('owner-settings-email-input') as HTMLInputElement | null

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

  accountForm?.addEventListener('submit', async (event) => {
    event.preventDefault()
    const firstName = (firstNameInput?.value ?? '').trim()
    const lastName = (lastNameInput?.value ?? '').trim()
    const email = (emailInput?.value ?? '').trim()
    if (!email) {
      showToast('Email është i detyrueshëm.')
      return
    }

    if (!isSupabaseConfigured) {
      const mock = getMockUser()
      setMockUser({
        email,
        role: mock?.role ?? 'OWNER',
        firstName,
        lastName,
      })
      accountInfo = { ...accountInfo, firstName, lastName, email }
      refreshUI()
      showToast('Account u përditësua (Demo).')
      return
    }

    const emailChanged = email !== accountInfo.email
    const payload: { email?: string; data: { first_name: string; last_name: string } } = {
      data: { first_name: firstName, last_name: lastName },
    }
    if (emailChanged) payload.email = email
    const { error } = await supabase.auth.updateUser(payload)
    if (error) {
      showToast(`Dështoi: ${error.message}`)
      return
    }
    accountInfo = { ...accountInfo, firstName, lastName, email }
    refreshUI()
    showToast(emailChanged ? 'Ruajtur. Kontrollo emailin për konfirmim.' : 'Account u përditësua.')
  })

  importBtn?.addEventListener('click', () => importInput?.click())
  importInput?.addEventListener('change', async () => {
    const file = importInput.files?.[0]
    if (!file) return
    let rows: ImportRow[] = []

    const filename = file.name.toLocaleLowerCase('sq-AL')
    const isExcel = filename.endsWith('.xlsx') || filename.endsWith('.xls')

    if (isExcel) {
      try {
        const XLSX = await import('xlsx')
        const buffer = await file.arrayBuffer()
        const wb = XLSX.read(buffer, { type: 'array' })
        const first = wb.SheetNames[0]
        if (!first) {
          showToast('Excel pa sheet të vlefshëm.')
          return
        }
        const sheet = wb.Sheets[first]
        const jsonRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })
        rows = jsonRows.map((r): ImportRow => {
          const categoryRaw = pickByKeys(r, ['category', 'kategoria', 'tipi']).toLocaleLowerCase('sq-AL')
          return {
            name: pickByKeys(r, ['name', 'emri', 'produkti', 'barna', 'bari']),
            supplier: pickByKeys(r, ['supplier', 'furnitori', 'furnitori']),
            category: parseCategory(categoryRaw),
            aliases: pickByKeys(r, ['aliases', 'alias', 'sinonime'])
              .split(/[|,]/)
              .map((a) => a.trim())
              .filter(Boolean),
          }
        }).filter((r) => r.name && r.supplier)
      } catch {
        showToast('Leximi i Excel dështoi.')
        return
      }
    } else {
      const text = await file.text()
      const lines = text.split(/\r?\n/).map((x) => x.trim()).filter(Boolean)
      if (lines.length <= 1) {
        showToast('CSV pa rreshta të vlefshëm.')
        return
      }
      rows = lines.slice(1).map((row): ImportRow => {
        const [name = '', supplier = '', category = 'barna', aliases = ''] = row.split(',')
        return {
          name: name.trim(),
          supplier: supplier.trim(),
          category: parseCategory(category),
          aliases: aliases.split(/[|,]/).map((a) => a.trim()).filter(Boolean),
        }
      }).filter((r) => r.name && r.supplier)
    }

    if (!rows.length) {
      showToast('Nuk u gjetën rreshta valide për import.')
      importInput.value = ''
      return
    }

    let okCount = 0
    for (const row of rows) {
      const result = await addProduct({
        name: row.name,
        supplier: row.supplier,
        category: row.category,
        aliases: row.aliases,
      })
      if (result.ok) okCount += 1
    }
    products = await getProducts()
    refreshUI()
    showToast(`Import u krye: ${okCount} produkte.`)
    importInput.value = ''
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

    if (action === 'download-pdf') {
      const orderId = Number(btn.dataset.orderId)
      const order = generatedOrders.find((o) => o.id === orderId)
      if (!order) return
      try {
        await downloadOrderPdf(order)
        showToast('PDF u shkarkua.')
      } catch {
        showToast('Shkarkimi i PDF dështoi.')
      }
      return
    }

    if (action === 'mark-sent') {
      const orderId = Number(btn.dataset.orderId)
      const index = generatedOrders.findIndex((o) => o.id === orderId)
      if (index === -1) return
      try {
        generatedOrders[index] = await markOrderAsSent(generatedOrders[index])
        refreshUI()
        showToast('Porosia u shënua si dërguar.')
      } catch {
        showToast('Dështoi shënimi si dërguar.')
      }
      return
    }

    if (action === 'edit-note' && id) {
      const current = shortages.find((s) => s.id === id)
      if (!current) return
      const edited = await openShortageEditModal(current)
      if (!edited) return
      try {
        // suggestedQty mbahet në klient para gjenerimit të porosive.
        shortages = shortages.map((s) =>
          s.id === id ? { ...s, suggestedQty: Math.max(1, edited.suggestedQty) } : s
        )
        shortages = await updateShortageMeta(id, { note: edited.note, urgent: edited.urgent })
        shortages = shortages.map((s) =>
          s.id === id ? { ...s, suggestedQty: Math.max(1, edited.suggestedQty) } : s
        )
        refreshUI()
        showToast('Mungesa u përditësua.')
      } catch {
        showToast('Ndryshimi dështoi.')
      }
      return
    }

    if (action === 'delete-shortage' && id) {
      const yes = await openConfirmModal(
        'Fshirja e mungesës',
        'A je i sigurt që do ta fshish këtë mungesë? Ky veprim nuk kthehet.'
      )
      if (!yes) return
      try {
        shortages = await deleteShortage(id)
        refreshUI()
        showToast('Mungesa u fshi.')
      } catch {
        showToast('Fshirja dështoi.')
      }
      return
    }

    if (action === 'show-all') {
      showToast(`Gjithsej ${generatedOrders.length} porosi në listë.`)
      return
    }

    if (action === 'copy-shortage-name' && id) {
      const row = shortages.find((s) => s.id === id)
      if (!row) return
      try {
        await navigator.clipboard.writeText(`${row.productName} - ${row.supplierName}`)
        showToast('Detajet e mungesës u kopjuan.')
      } catch {
        showToast('Kopjimi dështoi.')
      }
      return
    }
  })

  const generateBtn = document.getElementById('btn-generate-orders') as HTMLButtonElement | null
  generateBtn?.addEventListener('click', async () => {
    generatedOrders = await generateOrdersFromShortages(getFilteredRows())
    refreshUI()
    showToast('Porositë u gjeneruan sipas furnitorit.')
  })

  Promise.all([getTodayShortages(), getProducts(), loadAccountInfo()]).then(([rows, productRows]) => {
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
