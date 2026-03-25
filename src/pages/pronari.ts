import { signOut } from '../lib/auth.js'
import { isSupabaseConfigured, supabase } from '../lib/supabase.js'
import { getProfile } from '../lib/auth.js'
import { getMockUser } from '../types.js'
import { jsPDF } from 'jspdf'
import {
  addProduct,
  deleteProduct,
  deleteShortage,
  generateOrdersFromShortages,
  getProducts,
  getTodayShortages,
  markOrderAsSent,
  updateProduct,
  updateShortageMeta,
  type ProductView,
  type ShortageView,
  type OwnerOrder,
} from '../lib/data.js'

const iconCopy = `<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2M10 20h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>`
const iconPdf = `<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9l-5-5H7a2 2 0 00-2 2v13a2 2 0 002 2z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 3v6h6" /></svg>`
const iconWhatsapp = `<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 21l2.2-6.2A8.9 8.9 0 1112 21a8.8 8.8 0 01-4.1-1L3 21z" /></svg>`
const iconCheck = `<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>`
const iconEdit = `<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5M18.5 2.5a2.1 2.1 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>`
const iconTrash = `<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 7h12M9 7V4h6v3m-7 4v6m4-6v6m4-6v6M8 20h8a2 2 0 002-2V7H6v11a2 2 0 002 2z" /></svg>`
const iconKpiShortage = `<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-6m3 6V7m3 10v-4m3 8H6a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2v14a2 2 0 01-2 2z" /></svg>`
const iconKpiOrders = `<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6M7 4h10l2 2v14H5V6l2-2z" /></svg>`
const iconKpiAlert = `<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4m0 4h.01" /></svg>`
const iconKpiProducts = `<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" /></svg>`
const iconSearch = `<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 117.5-7.5 7.5 7.5 0 01-7.5 7.5z" /></svg>`
const iconMenu = `<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" /></svg>`
const SUPPLIER_PHONE_STORAGE_KEY = 'flowinventory_supplier_phones'
const SHORTAGE_SORT_STORAGE_KEY = 'flowinventory-owner-shortage-sort'
type OwnerSection = 'mungesat' | 'porosite' | 'import'

function readStoredShortageSort(): 'supplier' | 'name' {
  try {
    const v = sessionStorage.getItem(SHORTAGE_SORT_STORAGE_KEY)
    return v === 'name' ? 'name' : 'supplier'
  } catch {
    return 'supplier'
  }
}

function persistShortageSort(value: 'supplier' | 'name'): void {
  try {
    sessionStorage.setItem(SHORTAGE_SORT_STORAGE_KEY, value)
  } catch {
  }
}

function compareAlbanian(a: string, b: string): number {
  return a.localeCompare(b, 'sq-AL', { sensitivity: 'base', numeric: true })
}

export function renderPronari(container: HTMLElement, routeSection = 'mungesat'): void {
  const section: OwnerSection =
    routeSection === 'porosite' || routeSection === 'import' ? routeSection : 'mungesat'
  const active = (key: OwnerSection): string => (section === key ? 'premium-nav-link active' : 'premium-nav-link')
  type ImportRow = {
    name: string
    supplier: string
    producerName?: string
    lastPaidPrice?: number
    lastPriceDate?: string
    defaultOrderQty?: number
    category: 'barna' | 'front'
    aliases: string[]
  }

  let shortages: ShortageView[] = []
  let products: ProductView[] = []
  let searchQuery = ''
  let sortBy: 'supplier' | 'name' = readStoredShortageSort()
  let generatedOrders: OwnerOrder[] = []
  let pendingImportRows: ImportRow[] = []
  let pendingImportIssues: string[] = []
  let importTab: 'manual' | 'file' = 'file'
  let productQuery = ''
  let productSortBy: 'name' | 'supplier' | 'category' = 'name'
  let ownerProductCategoryFilter: 'barna' | 'all' | 'front' = 'barna'
  let lastImportFileName = ''
  const suggestedQtyStorageKey = (() => {
    const d = new Date()
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `flowinventory-owner-suggested-qty-${y}-${m}-${day}`
  })()
  let accountInfo: {
    firstName: string
    lastName: string
    email: string
    role: string
    userId: string
    provider: string
    sessionMode: string
  } = {
    firstName: '',
    lastName: '',
    email: '—',
    role: '',
    userId: '—',
    provider: 'email',
    sessionMode: isSupabaseConfigured ? 'Supabase' : 'Demo',
  }

  function readSuggestedQtyDraft(): Record<string, number> {
    try {
      const raw = localStorage.getItem(suggestedQtyStorageKey)
      if (!raw) return {}
      const parsed = JSON.parse(raw) as Record<string, unknown>
      const clean: Record<string, number> = {}
      for (const [id, value] of Object.entries(parsed)) {
        const qty = Number(value)
        if (Number.isFinite(qty) && qty > 0) clean[id] = Math.floor(qty)
      }
      return clean
    } catch {
      return {}
    }
  }

  function applySuggestedQtyDraft(rows: ShortageView[]): ShortageView[] {
    const draft = readSuggestedQtyDraft()
    return rows.map((row) => {
      const qty = draft[row.id]
      if (!qty) return row
      return { ...row, suggestedQty: Math.max(1, qty) }
    })
  }

  function persistSuggestedQtyDraft(rows: ShortageView[]): void {
    const payload: Record<string, number> = {}
    rows.forEach((row) => {
      payload[row.id] = Math.max(1, Math.floor(Number(row.suggestedQty) || 1))
    })
    localStorage.setItem(suggestedQtyStorageKey, JSON.stringify(payload))
  }

  function clearSuggestedQtyDraft(): void {
    localStorage.removeItem(suggestedQtyStorageKey)
  }

  async function reloadShortages(): Promise<void> {
    shortages = applySuggestedQtyDraft(await getTodayShortages())
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
    const fallbackName = (user?.email ?? '').split('@')[0]?.trim() || 'Perdorues'
    accountInfo = {
      firstName: String(user?.user_metadata?.first_name ?? fallbackName),
      lastName: String(user?.user_metadata?.last_name ?? ''),
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
      'fixed bottom-4 right-4 z-50 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-lg'
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

  function splitCsvLine(line: string): string[] {
    const out: string[] = []
    let cur = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const c = line[i]
      if (c === '"') {
        inQuotes = !inQuotes
        continue
      }
      if (c === ',' && !inQuotes) {
        out.push(cur.trim())
        cur = ''
        continue
      }
      cur += c
    }
    out.push(cur.trim())
    return out
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

  function parsePositiveNumber(raw: string): number | undefined {
    if (!raw.trim()) return undefined
    const normalized = raw.replace(',', '.')
    const n = Number(normalized)
    if (!Number.isFinite(n) || n <= 0) return undefined
    return n
  }

  function parsePositiveInteger(raw: string): number | undefined {
    if (!raw.trim()) return undefined
    const n = Number.parseInt(raw, 10)
    if (!Number.isFinite(n) || n <= 0) return undefined
    return n
  }

  function parseDateIso(raw: string): string | undefined {
    const val = raw.trim()
    if (!val) return undefined
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val
    const parsed = new Date(val)
    if (Number.isNaN(parsed.getTime())) return undefined
    const y = parsed.getFullYear()
    const m = String(parsed.getMonth() + 1).padStart(2, '0')
    const d = String(parsed.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  function renderImportPreview(): string {
    if (!pendingImportRows.length && !pendingImportIssues.length) {
      return '<p class="text-[11px] text-slate-500">Zgjidh një file për preview para importit.</p>'
    }

    const issuesHtml = pendingImportIssues.length
      ? `<div class="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] text-amber-800">
          <p class="font-semibold mb-1">Rreshta të pavlefshëm (${pendingImportIssues.length})</p>
          <ul class="list-disc pl-4 space-y-0.5 max-h-28 overflow-auto">
            ${pendingImportIssues.map((x) => `<li>${x}</li>`).join('')}
          </ul>
        </div>`
      : ''

    const rowsHtml = pendingImportRows.length
      ? `<div class="overflow-auto rounded-xl border border-slate-200">
          <table class="min-w-full text-[11px]">
            <thead class="bg-slate-100 text-slate-700">
              <tr>
                <th class="px-2 py-1 text-left">Emri</th>
                <th class="px-2 py-1 text-left">Furnitori</th>
                <th class="px-2 py-1 text-left">Producer</th>
                <th class="px-2 py-1 text-left">Cmimi fundit</th>
                <th class="px-2 py-1 text-left">Data cmimit</th>
                <th class="px-2 py-1 text-left">Default qty</th>
                <th class="px-2 py-1 text-left">Emra alternativë</th>
                <th class="px-2 py-1 text-left">Category</th>
              </tr>
            </thead>
            <tbody>
              ${pendingImportRows.slice(0, 20).map((r) => `
                <tr class="border-t border-slate-200 hover:bg-slate-50/70 transition-colors">
                  <td class="px-2 py-1">${r.name}</td>
                  <td class="px-2 py-1">${r.supplier}</td>
                  <td class="px-2 py-1">${r.producerName ?? '—'}</td>
                  <td class="px-2 py-1">${r.lastPaidPrice ?? '—'}</td>
                  <td class="px-2 py-1">${r.lastPriceDate ?? '—'}</td>
                  <td class="px-2 py-1">${r.defaultOrderQty ?? '—'}</td>
                  <td class="px-2 py-1 max-w-32 truncate" title="${(r.aliases ?? []).join(', ')}">${(r.aliases ?? []).length ? (r.aliases ?? []).join(', ') : '—'}</td>
                  <td class="px-2 py-1">${r.category}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>`
      : '<p class="text-[11px] text-slate-500">Nuk ka rreshta valid për import.</p>'

    return `
      <div class="space-y-2">
        <div class="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600">
          <div class="flex items-center gap-2">
            <span class="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700">Valid: ${pendingImportRows.length}</span>
            <span class="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 font-semibold text-amber-700">Gabime: ${pendingImportIssues.length}</span>
            ${lastImportFileName ? `<span class="truncate max-w-50 text-slate-500" title="${lastImportFileName}">${lastImportFileName}</span>` : ''}
          </div>
          <button data-action="apply-import" class="rounded-lg border border-blue-200 bg-blue-50 px-2 py-1 font-semibold text-blue-700 hover:bg-blue-100 ${pendingImportRows.length ? '' : 'opacity-50 pointer-events-none'}">
            Apliko importin
          </button>
        </div>
        ${issuesHtml}
        ${rowsHtml}
      </div>
    `
  }

  function getFilteredProducts(): ProductView[] {
    const q = productQuery.toLocaleLowerCase('sq-AL').trim()
    let rows = products
    if (ownerProductCategoryFilter === 'barna') {
      rows = rows.filter((p) => p.category === 'barna')
    } else if (ownerProductCategoryFilter === 'front') {
      rows = rows.filter((p) => p.category === 'front')
    }
    if (q) {
      rows = rows.filter((p) => {
        const name = p.name.toLocaleLowerCase('sq-AL')
        const supplier = p.supplierName.toLocaleLowerCase('sq-AL')
        const category = p.category.toLocaleLowerCase('sq-AL')
        const aliases = p.aliases.join(' ').toLocaleLowerCase('sq-AL')
        return name.includes(q) || supplier.includes(q) || category.includes(q) || aliases.includes(q)
      })
    }
    return [...rows].sort((a, b) => {
      const nameA = a.name.toLocaleLowerCase('sq-AL')
      const nameB = b.name.toLocaleLowerCase('sq-AL')
      const supplierA = a.supplierName.toLocaleLowerCase('sq-AL')
      const supplierB = b.supplierName.toLocaleLowerCase('sq-AL')
      const categoryA = a.category.toLocaleLowerCase('sq-AL')
      const categoryB = b.category.toLocaleLowerCase('sq-AL')
      if (productSortBy === 'supplier') {
        return compareAlbanian(supplierA, supplierB) || compareAlbanian(nameA, nameB)
      }
      if (productSortBy === 'category') {
        return compareAlbanian(categoryA, categoryB) || compareAlbanian(nameA, nameB)
      }
      return compareAlbanian(nameA, nameB) || compareAlbanian(supplierA, supplierB)
    })
  }

  function parseAliasesInput(raw: string): string[] {
    return raw
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean)
  }

  function getSupplierPhones(): Record<string, string> {
    try {
      const raw = localStorage.getItem(SUPPLIER_PHONE_STORAGE_KEY)
      return raw ? (JSON.parse(raw) as Record<string, string>) : {}
    } catch {
      return {}
    }
  }

  function setSupplierPhones(map: Record<string, string>): void {
    localStorage.setItem(SUPPLIER_PHONE_STORAGE_KEY, JSON.stringify(map))
  }

  function normalizePhone(raw: string): string {
    return raw.replace(/[^\d]/g, '')
  }

  function openWhatsAppPhoneModal(supplier: string, initial = ''): Promise<string | null> {
    return new Promise((resolve) => {
      const overlay = document.createElement('div')
      overlay.className = 'fixed inset-0 z-[70] bg-slate-900/18 flex items-center justify-center p-4'
      overlay.innerHTML = `
        <div class="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
          <h3 class="text-lg font-semibold text-slate-900 mb-1">Numri i WhatsApp</h3>
          <p class="text-sm text-slate-600 mb-4">
            Shkruaj numrin për furnitorin <strong>${supplier}</strong> (shembull: 38344111222).
          </p>
          <label class="text-sm text-slate-700 block">
            Numri
            <input id="owner-wa-phone" type="text" value="${initial}" placeholder="383..." class="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </label>
          <div class="mt-4 flex items-center justify-end gap-2">
            <button type="button" id="owner-wa-cancel" class="premium-btn-ghost rounded-xl px-4 py-2 text-sm font-medium">Anulo</button>
            <button type="button" id="owner-wa-open" class="premium-btn-primary rounded-xl px-4 py-2 text-sm font-semibold">Hap WhatsApp</button>
          </div>
        </div>
      `
      document.body.appendChild(overlay)
      const input = overlay.querySelector<HTMLInputElement>('#owner-wa-phone')
      input?.focus()
      input?.select()

      const close = (value: string | null) => {
        overlay.remove()
        resolve(value)
      }

      overlay.querySelector<HTMLButtonElement>('#owner-wa-cancel')?.addEventListener('click', () => close(null))
      overlay.querySelector<HTMLButtonElement>('#owner-wa-open')?.addEventListener('click', () => {
        close((input?.value ?? '').trim())
      })
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) close(null)
      })
    })
  }

  function openShortageEditModal(initial: ShortageView): Promise<{
    suggestedQty: number
    urgent: boolean
    note: string
  } | null> {
    return new Promise((resolve) => {
      const overlay = document.createElement('div')
      overlay.className = 'fixed inset-0 z-[70] bg-slate-900/18 flex items-center justify-center p-4'
      overlay.innerHTML = `
        <div class="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
          <h3 class="text-lg font-semibold text-slate-900 mb-1">Përditëso mungesën</h3>
          <p class="text-sm text-slate-500 mb-4">Ndrysho të dhënat për <strong>${initial.productName}</strong>.</p>
          <div class="grid gap-3 md:grid-cols-2">
            <label class="text-sm text-slate-700">
              Sasia për porosi
              <input id="owner-edit-qty" type="number" min="1" value="${initial.suggestedQty}" class="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </label>
            <label class="text-sm text-slate-700 flex items-end">
              <span class="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2">
                <input id="owner-edit-urgent" type="checkbox" ${initial.urgent ? 'checked' : ''} class="h-4 w-4 rounded border-slate-300 text-red-600 focus:ring-blue-500" />
                URGJENT
              </span>
            </label>
          </div>
          <label class="mt-3 block text-sm text-slate-700">
            Shënimi
            <textarea id="owner-edit-note" class="mt-1 w-full min-h-48 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Shkruaj shënimin...">${initial.note ?? ''}</textarea>
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

  function openProductEditModal(initial: ProductView): Promise<{
    name: string
    supplier: string
    category: 'barna' | 'front'
    aliases: string[]
  } | null> {
    return new Promise((resolve) => {
      const overlay = document.createElement('div')
      overlay.className = 'fixed inset-0 z-[70] bg-slate-900/18 flex items-center justify-center p-4'
      overlay.innerHTML = `
        <div class="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
          <h3 class="text-lg font-semibold text-slate-900 mb-1">Përditëso produktin</h3>
          <p class="text-sm text-slate-500 mb-4">Ndrysho të dhënat bazë të produktit.</p>
          <div class="grid gap-3 md:grid-cols-2">
            <label class="text-sm text-slate-700">
              Emri i produktit
              <input id="owner-edit-product-name" type="text" class="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </label>
            <label class="text-sm text-slate-700">
              Furnitori
              <input id="owner-edit-product-supplier" type="text" class="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </label>
            <label class="text-sm text-slate-700">
              Kategoria
              <select id="owner-edit-product-category" class="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="barna">Barna</option>
                <option value="front">Front</option>
              </select>
            </label>
            <label class="text-sm text-slate-700 md:col-span-2">
              Emra alternativë (ndarë me presje)
              <input id="owner-edit-product-aliases" type="text" class="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </label>
          </div>
          <p id="owner-edit-product-error" class="mt-2 text-xs text-red-600"></p>
          <div class="mt-4 flex items-center justify-end gap-2">
            <button type="button" id="owner-edit-product-cancel" class="premium-btn-ghost rounded-xl px-4 py-2 text-sm font-medium">Anulo</button>
            <button type="button" id="owner-edit-product-save" class="premium-btn-primary rounded-xl px-4 py-2 text-sm font-semibold">Ruaj ndryshimet</button>
          </div>
        </div>
      `
      document.body.appendChild(overlay)

      const nameInput = overlay.querySelector<HTMLInputElement>('#owner-edit-product-name')
      const supplierInput = overlay.querySelector<HTMLInputElement>('#owner-edit-product-supplier')
      const categoryInput = overlay.querySelector<HTMLSelectElement>('#owner-edit-product-category')
      const aliasesInput = overlay.querySelector<HTMLInputElement>('#owner-edit-product-aliases')
      const errorEl = overlay.querySelector<HTMLParagraphElement>('#owner-edit-product-error')
      const cancelBtn = overlay.querySelector<HTMLButtonElement>('#owner-edit-product-cancel')
      const saveBtn = overlay.querySelector<HTMLButtonElement>('#owner-edit-product-save')

      if (nameInput) nameInput.value = initial.name
      if (supplierInput) supplierInput.value = initial.supplierName
      if (categoryInput) categoryInput.value = initial.category
      if (aliasesInput) aliasesInput.value = initial.aliases.join(', ')
      nameInput?.focus()

      const close = (
        value: { name: string; supplier: string; category: 'barna' | 'front'; aliases: string[] } | null
      ) => {
        overlay.remove()
        resolve(value)
      }

      cancelBtn?.addEventListener('click', () => close(null))
      saveBtn?.addEventListener('click', () => {
        const name = (nameInput?.value ?? '').trim()
        const supplier = (supplierInput?.value ?? '').trim()
        if (!name) {
          if (errorEl) errorEl.textContent = 'Emri është i detyrueshëm.'
          nameInput?.focus()
          return
        }
        if (!supplier) {
          if (errorEl) errorEl.textContent = 'Furnitori është i detyrueshëm.'
          supplierInput?.focus()
          return
        }
        const category = categoryInput?.value === 'front' ? 'front' : 'barna'
        const aliases = parseAliasesInput(aliasesInput?.value ?? '')
        close({ name, supplier, category, aliases })
      })
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) close(null)
      })
    })
  }

  function openConfirmModal(title: string, description: string): Promise<boolean> {
    return new Promise((resolve) => {
      const overlay = document.createElement('div')
      overlay.className = 'fixed inset-0 z-[70] bg-slate-900/18 flex items-center justify-center p-4'
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
      rows = rows.filter((s) => {
        const product = s.productName.toLocaleLowerCase('sq-AL')
        const supplier = s.supplierName.toLocaleLowerCase('sq-AL')
        return product.includes(q) || supplier.includes(q)
      })
    }
    const sortText = (value: string): string => value.toLocaleLowerCase('sq-AL').trim()
    rows.sort((a, b) => {
      const nameA = sortText(a.productName)
      const nameB = sortText(b.productName)
      const supplierA = sortText(a.supplierName)
      const supplierB = sortText(b.supplierName)
      if (sortBy === 'name') {
        return compareAlbanian(nameA, nameB) || compareAlbanian(supplierA, supplierB)
      }
      return compareAlbanian(supplierA, supplierB) || compareAlbanian(nameA, nameB)
    })
    return rows
  }

  function buildReceipt(order: OwnerOrder): string {
    const date = new Date().toLocaleString('sq-AL')
    return `POROSI MUNGESASH
Data: ${date}
Furnitori: ${order.supplier}
ID: #${order.id}
---------------------------
${order.items.join('\n')}

Shënim: Ju lutem konfirmoni disponueshmërinë dhe kohën e dorëzimit.`
  }

  async function downloadOrderPdf(order: OwnerOrder): Promise<void> {
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
      return `<tr><td colspan="5" class="px-3 py-8 text-center">
        <div class="premium-empty">
          <div class="premium-empty-title">Nuk ka rezultate për këtë kërkim</div>
          <p class="premium-empty-copy">Provo me një emër tjetër ose ndrysho renditjen.</p>
        </div>
      </td></tr>`
    }
    return rows
      .map(
        (s) => `
      <tr class="owner-shortage-row border-t border-slate-200 hover:bg-slate-50/70 transition-colors">
        <td data-label="Barna" class="px-3 py-3">
          <div class="flex items-center gap-2">
            <div class="owner-product-badge h-7 w-7 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-[10px] font-semibold text-blue-700">
              ${s.productName.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div class="text-slate-800 text-xs font-medium">${s.productName}</div>
              <div class="text-[10px] text-slate-500">${s.supplierName}</div>
            </div>
          </div>
        </td>
        <td data-label="Sasia" class="px-3 py-3">
          <div class="owner-qty-pill inline-flex items-center rounded-full border border-slate-300 bg-white px-2 py-1 gap-1">
            <button data-action="decrement" data-id="${s.id}" class="owner-qty-btn text-slate-600 text-xs px-1 hover:text-slate-900">-</button>
            <span class="owner-qty-value w-6 text-center text-slate-800 text-xs">${s.suggestedQty}</span>
            <button data-action="increment" data-id="${s.id}" class="owner-qty-btn text-slate-600 text-xs px-1 hover:text-slate-900">+</button>
          </div>
        </td>
        <td data-label="Furnitori" class="owner-supplier-cell px-3 py-3 text-slate-700 text-xs">${s.supplierName}</td>
        <td data-label="Shënim" class="px-3 py-3">
          <div class="flex items-center gap-2">
            <span class="owner-status-pill rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
              s.urgent
                ? 'owner-status-urgent bg-red-100 text-red-700 border-red-200'
                : 'owner-status-normal bg-slate-100 text-slate-600 border-slate-200'
            }">
              ${s.urgent ? 'URGJENT' : 'Normal'}
            </span>
            ${s.note ? `<span class="owner-note-text text-[11px] text-slate-600 max-w-40 truncate">${s.note}</span>` : ''}
          </div>
        </td>
        <td data-label="Veprime" class="px-3 py-3 text-right">
          <div class="inline-flex items-center gap-1.5">
            <button data-action="copy-shortage-name" data-id="${s.id}" title="Kopjo detajet" class="ui-icon-btn">${iconCopy}</button>
            <button data-action="edit-note" data-id="${s.id}" title="Ndrysho mungesën" class="ui-icon-btn">${iconEdit}</button>
            <button data-action="delete-shortage" data-id="${s.id}" title="Fshi mungesën" class="ui-icon-btn">${iconTrash}</button>
          </div>
        </td>
      </tr>`
      )
      .join('')
  }

  function setOrderStatus(
    orderId: number,
    status: OwnerOrder['status'],
    dbId?: string
  ): void {
    const update = (orders: OwnerOrder[]): OwnerOrder[] => {
      const idx = orders.findIndex((o) =>
        dbId ? o.dbId === dbId : o.id === orderId
      )
      if (idx === -1) return orders
      const copy = [...orders]
      copy[idx] = { ...copy[idx], status }
      return copy
    }
    generatedOrders = update(generatedOrders)
  }

  function getOrderById(orderId: number): OwnerOrder | undefined {
    return generatedOrders.find((o) => o.id === orderId)
  }

  function resolveOrderFromBtn(btn: HTMLButtonElement): OwnerOrder | undefined {
    const dbId = btn.dataset.orderDbId?.trim()
    if (dbId) {
      return generatedOrders.find((o) => o.dbId === dbId)
    }
    const orderId = Number(btn.dataset.orderId)
    if (!Number.isFinite(orderId)) return undefined
    return getOrderById(orderId)
  }

  function renderOrderStatus(status: OwnerOrder['status']): string {
    if (status === 'SENT') {
      return `<span class="owner-order-status owner-order-status-sent inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">E dërguar</span>`
    }
    if (status === 'FAILED') {
      return `<span class="owner-order-status owner-order-status-failed inline-flex items-center rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700">Dështoi</span>`
    }
    return `<span class="owner-order-status owner-order-status-pending inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">E padërguar</span>`
  }

  function renderOrdersPanel(): string {
    const ordersToRender = generatedOrders
    if (!ordersToRender.length) {
      return `<div class="premium-empty">
        <div class="premium-empty-title">Nuk ka porosi të ditës së sotme</div>
        <p class="premium-empty-copy">Kliko «Gjenero porositë e ditës së sotme» për t'i krijuar porositë.</p>
      </div>`
    }
    return `
      <div class="owner-orders-table-wrap overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table class="min-w-full text-xs">
          <thead class="owner-orders-head ui-table-head bg-slate-100 text-slate-700">
            <tr>
              <th class="px-3 py-2.5 text-left font-semibold">ID</th>
              <th class="px-3 py-2.5 text-left font-semibold">Produkti</th>
              <th class="px-3 py-2.5 text-left font-semibold">Sasia</th>
              <th class="px-3 py-2.5 text-left font-semibold">Status</th>
              <th class="px-3 py-2.5 text-right font-semibold">Veprime</th>
            </tr>
          </thead>
          <tbody>
            ${ordersToRender
              .map((o) => {
                const qtySum = o.items.reduce((sum, item) => {
                  const m = item.match(/^(\d+)/)
                  if (!m) return sum
                  return sum + Number(m[1])
                }, 0)
                const productList = o.items.map((item) => item.replace(/^\d+\s*[x×]\s*/i, '')).join(', ')
                return `
                  <tr class="owner-order-row border-t border-slate-200 hover:bg-slate-50/80 transition-colors">
                    <td data-label="ID" class="owner-order-id px-3 py-3 font-semibold text-blue-700">#${o.id}</td>
                    <td data-label="Produkti" class="owner-order-product-cell px-3 py-3 text-slate-700">
                      <p class="owner-order-product-name font-medium text-slate-800">${o.supplier}</p>
                      <p class="owner-order-product-list mt-0.5 max-w-[320px] truncate text-[11px] text-slate-500">${productList || '—'}</p>
                    </td>
                    <td data-label="Sasia" class="owner-order-qty px-3 py-3 text-slate-700 font-medium">${qtySum || o.items.length}</td>
                    <td data-label="Status" class="px-3 py-3">${renderOrderStatus(o.status)}</td>
                    <td data-label="Veprime" class="px-3 py-3">
                      <div class="flex items-center justify-end gap-1.5">
                        <button data-action="copy" data-order-id="${o.id}" data-order-db-id="${o.dbId ?? ''}" title="Kopjo reciptin për WhatsApp" aria-label="Kopjo reciptin për WhatsApp" class="ui-icon-btn">
                          ${iconCopy}
                        </button>
                        <button data-action="download-pdf" data-order-id="${o.id}" data-order-db-id="${o.dbId ?? ''}" title="Shkarko PDF" aria-label="Shkarko PDF" class="ui-icon-btn">
                          ${iconPdf}
                        </button>
                        <button data-action="whatsapp" data-order-id="${o.id}" data-order-db-id="${o.dbId ?? ''}" title="Hap WhatsApp me reciptin" aria-label="Hap WhatsApp me reciptin" class="ui-icon-btn">
                          ${iconWhatsapp}
                        </button>
                        <button data-action="mark-sent" data-order-id="${o.id}" data-order-db-id="${o.dbId ?? ''}" title="Shëno porosinë si E dërguar" aria-label="Shëno porosinë si E dërguar" class="ui-icon-btn">
                          ${iconCheck}
                        </button>
                      </div>
                    </td>
                  </tr>`
              })
              .join('')}
          </tbody>
        </table>
      </div>
    `
  }

  function refreshUI(): void {
    const tableBody = document.getElementById('owner-shortage-body')
    const ordersList = document.getElementById('owner-orders-list')
    const productsList = document.getElementById('owner-products-list')
    const importPreview = document.getElementById('owner-import-preview')
    if (tableBody) tableBody.innerHTML = renderShortagesBody()
    if (ordersList) ordersList.innerHTML = renderOrdersPanel()
    if (importPreview) importPreview.innerHTML = renderImportPreview()
    if (productsList) {
      const productRows = getFilteredProducts()
      productsList.innerHTML = productRows
        .slice(0, 40)
        .map(
          (p) =>
            `<li class="flex items-start justify-between gap-2 border-b border-slate-200 py-2 text-xs">
              <div class="min-w-0">
                <p class="font-medium text-slate-700 truncate">${p.name}</p>
                <p class="text-slate-500">
                  ${p.supplierName} • ${p.category === 'front' ? 'Front' : 'Barna'} • ${
                  p.aliases.length ? p.aliases.join(', ') : 'pa emra alternativë'
                }
                </p>
              </div>
              <div class="inline-flex items-center gap-1.5">
                <button data-action="edit-product" data-product-id="${p.id}" title="Ndrysho produktin" class="ui-icon-btn">${iconEdit}</button>
                <button data-action="delete-product" data-product-id="${p.id}" title="Fshi produktin" class="ui-icon-btn">${iconTrash}</button>
              </div>
            </li>`
        )
        .join('')
      const count = document.getElementById('owner-products-count')
      if (count) count.textContent = `${productRows.length}/${products.length}`
    }
    const countTop = document.getElementById('owner-products-count-top')
    if (countTop) countTop.textContent = `${products.length}`
    const statShortages = document.getElementById('owner-stat-shortages')
    const statOrders = document.getElementById('owner-stat-orders')
    const statUrgent = document.getElementById('owner-stat-urgent')
    const sortHint = document.getElementById('owner-sort-hint')
    if (statShortages) statShortages.textContent = String(shortages.length)
    if (statOrders) statOrders.textContent = String(generatedOrders.length)
    if (statUrgent) statUrgent.textContent = String(shortages.filter((s) => s.urgent).length)
    if (sortHint) sortHint.textContent = sortBy === 'name' ? 'Renditur sipas emrit' : 'Renditur sipas furnitorit'
    const sortSelectEl = document.getElementById('owner-sort') as HTMLSelectElement | null
    if (sortSelectEl) {
      const next = sortBy === 'name' ? 'name' : 'supplier'
      if (sortSelectEl.value !== next) sortSelectEl.value = next
    }
    const importTabManual = document.getElementById('owner-import-tab-manual')
    const importTabFile = document.getElementById('owner-import-tab-file')
    if (importTabManual && importTabFile) {
      importTabManual.className = importTab === 'manual' ? 'premium-btn-primary rounded-lg px-3 py-1.5 text-xs font-semibold' : 'premium-btn-ghost rounded-lg px-3 py-1.5 text-xs font-medium'
      importTabFile.className = importTab === 'file' ? 'premium-btn-primary rounded-lg px-3 py-1.5 text-xs font-semibold' : 'premium-btn-ghost rounded-lg px-3 py-1.5 text-xs font-medium'
    }
    const productsSearchInput = document.getElementById('owner-products-search') as HTMLInputElement | null
    const productsSortSelect = document.getElementById('owner-products-sort') as HTMLSelectElement | null
    const productsCategoryFilter = document.getElementById(
      'owner-products-category-filter'
    ) as HTMLSelectElement | null
    if (productsSearchInput && productsSearchInput.value !== productQuery) productsSearchInput.value = productQuery
    if (productsSortSelect && productsSortSelect.value !== productSortBy) productsSortSelect.value = productSortBy
    if (productsCategoryFilter && productsCategoryFilter.value !== ownerProductCategoryFilter) {
      productsCategoryFilter.value = ownerProductCategoryFilter
    }

    const sidebarAvatar = document.getElementById('owner-sidebar-avatar')
    const sidebarName = document.getElementById('owner-sidebar-name')
    const sidebarRole = document.getElementById('owner-sidebar-role')
    const menuAvatar = document.getElementById('owner-menu-avatar')
    const displayName = `${accountInfo.firstName} ${accountInfo.lastName}`.trim()
    if (sidebarAvatar) sidebarAvatar.textContent = (accountInfo.firstName || 'O').slice(0, 1).toUpperCase()
    if (menuAvatar) menuAvatar.textContent = (accountInfo.firstName || 'O').slice(0, 1).toUpperCase()
    if (sidebarName) sidebarName.textContent = displayName || 'Përdorues'
    if (sidebarRole) sidebarRole.textContent = accountInfo.role || '...'
  }

  const selIfImportCat = (v: 'barna' | 'all' | 'front'): string =>
    ownerProductCategoryFilter === v ? 'selected' : ''

  container.innerHTML = `
    <div id="owner-shell" class="premium-shell">
      <aside id="owner-sidebar" class="premium-sidebar premium-drawer flex flex-col justify-between px-4 py-5">
        <div>
          <div class="mb-6 flex items-center justify-between gap-2">
            <div class="flex items-center gap-2">
              <div class="w-9 h-9 rounded-2xl bg-white flex items-center justify-center shadow">
                <img src="/brand/flowguard/logo.png" alt="FlowGuard logo" class="w-7 h-7 rounded-full object-cover" />
              </div>
              <span class="text-sm font-semibold text-slate-900">FlowInventory</span>
            </div>
            <button type="button" id="owner-nav-toggle" class="premium-nav-toggle shrink-0" aria-label="Hap menynë" aria-expanded="true">
              ${iconMenu}
            </button>
          </div>
          <nav class="space-y-1 text-sm">
            <a href="#/pronari" class="${active('mungesat')}"><span class="premium-nav-dot"></span>Mungesat</a>
            <a href="#/porosite" class="${active('porosite')}"><span class="premium-nav-dot"></span>Porositë</a>
            <a href="#/import" class="${active('import')}"><span class="premium-nav-dot"></span>Import</a>
          </nav>
        </div>
        <div class="space-y-2">
          <div id="owner-sidebar-account-card" class="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2.5">
            <div id="owner-sidebar-avatar" class="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-sm font-semibold text-blue-700">
              O
            </div>
            <div class="text-xs">
              <div id="owner-sidebar-name" class="text-slate-900 font-medium">Përdorues</div>
              <div id="owner-sidebar-role" class="text-slate-500 text-[11px]">...</div>
            </div>
          </div>
        </div>
      </aside>
      <div id="owner-sidebar-backdrop" class="premium-sidebar-backdrop hidden"></div>
      <button
        type="button"
        id="owner-logo-reopen"
        class="hidden fixed left-3 top-20 z-40 rounded-xl border border-slate-200 bg-white p-1 shadow-sm"
        aria-label="Hap menynë"
        title="Hap menynë"
      >
        <img src="/brand/flowguard/logo.png" alt="FlowInventory" class="h-6 w-6 rounded-full object-cover" />
      </button>

      <main class="premium-main px-4 py-4 md:px-6 md:py-5">
        <header class="premium-header relative z-30 mb-5 overflow-visible border-b border-slate-200 pb-4">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div class="min-w-0 flex flex-1 items-center gap-2">
              <div class="min-w-0">
              <p class="text-xs uppercase tracking-wide text-slate-500">${section === 'mungesat' ? 'Mungesat' : section === 'porosite' ? 'Porositë' : 'Import'}</p>
              ${
                section === 'mungesat'
                  ? ''
                  : `<h1 class="text-xl md:text-2xl font-semibold tracking-tight text-slate-900">${
                      section === 'porosite'
                        ? 'Porositë të ndara sipas furnitorit'
                        : 'Menaxho importin dhe produktet'
                    }</h1>`
              }
              </div>
            </div>
            <div class="owner-header-controls flex w-full flex-col gap-2 md:w-auto md:flex-row md:items-center md:justify-end">
              <div class="${section === 'mungesat' ? '' : 'hidden '}owner-header-search-wrap w-full md:w-auto md:min-w-[16rem] md:max-w-[24rem]">
                <div class="premium-top-search">
                  <span class="premium-top-search-icon">${iconSearch}</span>
                  <input
                    id="owner-top-search"
                    type="text"
                    placeholder="Kërko për artikuj ose furnitorë..."
                    class="premium-top-search-input"
                  />
                </div>
              </div>
              <button type="button" id="btn-import-csv" class="hidden items-center gap-2 rounded-xl px-3 py-2 text-xs">
                Ngarko file (Excel/CSV)
              </button>
              <input id="import-csv-input" type="file" accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" class="hidden" />
              <div class="owner-header-actions flex items-center justify-end gap-2">
                <button type="button" data-theme-toggle="1" class="theme-toggle-chip inline-flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold"></button>
                <div id="owner-account-wrap" class="relative">
                  <button type="button" id="owner-account-menu-btn" class="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-700 hover:bg-slate-50">
                    <span id="owner-menu-avatar" class="flex h-7 w-7 items-center justify-center rounded-full bg-blue-50 text-xs font-semibold text-blue-700">O</span>
                    <span class="text-slate-500">⋯</span>
                  </button>
                  <div id="owner-account-menu" class="hidden absolute right-0 top-full mt-2 w-48 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl z-120">
                    <button type="button" id="owner-account-logout" class="w-full text-left rounded-lg px-2.5 py-2 text-xs text-red-700 hover:bg-red-50">
                      ⎋ Dil nga account
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        <section class="${section === 'import' ? 'hidden ' : ''}relative z-0 mb-6 grid gap-3 md:grid-cols-4">
          <div class="premium-kpi p-3">
            <div class="ui-kpi-icon">${iconKpiShortage}</div>
            <p class="mt-2 text-[11px] uppercase tracking-wide text-slate-500">Kontrolli</p>
            <p id="owner-stat-shortages" class="ui-kpi-number mt-1 text-slate-900">0</p>
            <p class="text-xs text-slate-500">Mungesa aktive për sot.</p>
          </div>
          <div class="premium-kpi p-3">
            <div class="ui-kpi-icon">${iconKpiOrders}</div>
            <p class="mt-2 text-[11px] uppercase tracking-wide text-slate-500">Efikasitet</p>
            <p id="owner-stat-orders" class="ui-kpi-number mt-1 text-slate-900">0</p>
            <p class="text-xs text-slate-500">Porosi të gjeneruara në këtë sesion.</p>
          </div>
          <div class="premium-kpi p-3">
            <div class="ui-kpi-icon">${iconKpiAlert}</div>
            <p class="mt-2 text-[11px] uppercase tracking-wide text-slate-500">Gjurmim</p>
            <p id="owner-stat-urgent" class="ui-kpi-number mt-1 text-slate-900">0</p>
            <p class="text-xs text-slate-500">Raste urgjente për veprim të shpejtë.</p>
          </div>
          <div class="premium-kpi p-3">
            <div class="ui-kpi-icon">${iconKpiProducts}</div>
            <p class="mt-2 text-[11px] uppercase tracking-wide text-slate-500">Produktet</p>
            <p id="owner-products-count-top" class="ui-kpi-number mt-1 text-slate-900">0</p>
            <p class="text-xs text-slate-500">Barna të regjistruara në sistem.</p>
          </div>
        </section>

        <section class="relative z-0 grid gap-4">
          <div class="${section === 'mungesat' ? '' : 'hidden '}premium-card p-4 md:p-5">
            <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div>
                <h2 class="text-base font-semibold text-slate-900">Lista live e mungesave për sot</h2>
                <p id="owner-sort-hint" class="text-xs text-slate-500">Renditur sipas furnitorit</p>
              </div>
              <div class="flex items-center gap-2">
                <select id="owner-sort" class="premium-input rounded-lg px-2.5 py-1.5 text-xs focus:outline-none" aria-label="Renditja e listës së mungesave">
                  <option value="supplier" ${sortBy === 'supplier' ? 'selected' : ''}>Renditur sipas: Furnitorit</option>
                  <option value="name" ${sortBy === 'name' ? 'selected' : ''}>Renditur sipas: Emrit</option>
                </select>
              </div>
            </div>
            <div class="owner-shortages-table-wrap overflow-hidden rounded-xl border border-slate-200 bg-white">
              <table class="min-w-full text-xs">
                <thead class="ui-table-head bg-slate-100 text-slate-700">
                  <tr>
                    <th class="px-3 py-2 text-left font-medium">Barna</th>
                    <th class="px-3 py-2 text-left font-medium">Sasia e sugjeruar</th>
                    <th class="px-3 py-2 text-left font-medium">Furnitori</th>
                    <th class="px-3 py-2 text-left font-medium">Shënime</th>
                    <th class="px-3 py-2 text-right font-medium">Veprime</th>
                  </tr>
                </thead>
                <tbody id="owner-shortage-body">${renderShortagesBody()}</tbody>
              </table>
            </div>
            <p class="mt-2 text-[11px] text-slate-500 flex items-center gap-1">
              <span class="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
              Shikoni sasinë e sugjeruar dhe ndryshojeni vetëm kur duhet; pastaj «Gjenero porositë e ditës së sotme».
            </p>
          </div>

          <div class="${section === 'mungesat' || section === 'porosite' ? '' : 'hidden '}space-y-3">
            <div id="owner-orders-panel" class="premium-card p-4">
              <div class="flex items-center justify-between mb-2">
                <h2 class="text-base font-semibold text-slate-900">Porositë të ndara sipas furnitorit</h2>
              </div>
              <div id="owner-orders-list" class="space-y-2">${renderOrdersPanel()}</div>
              <div class="mt-3">
                <button type="button" id="btn-generate-orders-today" class="premium-btn-primary inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-[11px] font-semibold sm:px-4 sm:text-xs">
                  Gjenero porositë e ditës së sotme
                </button>
              </div>
            </div>
          </div>

          <div class="${section === 'import' ? '' : 'hidden '}space-y-3">
              <div class="premium-card p-4">
                <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div>
                    <h3 class="text-base font-semibold text-slate-900">Menaxho importin</h3>
                    <p class="text-[11px] text-slate-500">Zgjidh mënyrën: shtim manual ose import masiv nga file.</p>
                    <p class="mt-1 text-[11px] text-slate-600 leading-snug">
                      Kolonat: <strong>name</strong>, <strong>supplier_name</strong> (të detyrueshme). Opsionale:
                      producer_name, last_paid_price, last_price_date, default_order_qty, emra_alternative, category (default <strong>barna</strong>).
                      Furnitori = burimi i porosisë; <strong>producer_name</strong> është vetëm informacion.
                    </p>
                  </div>
                  <div class="inline-flex items-center gap-2">
                    <button type="button" id="owner-import-tab-manual" data-action="switch-import-tab" data-tab="manual" class="premium-btn-ghost rounded-lg px-3 py-1.5 text-xs font-semibold">
                      Manual
                    </button>
                    <button type="button" id="owner-import-tab-file" data-action="switch-import-tab" data-tab="file" class="premium-btn-primary rounded-lg px-3 py-1.5 text-xs font-semibold">
                      Excel / CSV
                    </button>
                  </div>
                </div>

                <div id="owner-import-manual-panel" class="hidden">
                  <form id="owner-product-form" class="grid gap-2 md:grid-cols-2">
                    <input id="owner-product-name" type="text" placeholder="Emri i barit (p.sh. Paracetamol 500mg)" class="premium-input w-full rounded-lg px-2.5 py-1.5 text-xs placeholder:text-slate-400 focus:outline-none md:col-span-2" />
                    <input id="owner-product-supplier" type="text" placeholder="Furnitori (p.sh. TrePharm)" class="premium-input w-full rounded-lg px-2.5 py-1.5 text-xs placeholder:text-slate-400 focus:outline-none" />
                    <select id="owner-product-category" class="premium-input w-full rounded-lg px-2.5 py-1.5 text-xs focus:outline-none">
                      <option value="barna">Barna</option>
                      <option value="front">Front</option>
                    </select>
                    <input id="owner-product-aliases" type="text" placeholder="Emra alternativë (opsional), ndarë me presje" class="premium-input w-full rounded-lg px-2.5 py-1.5 text-xs placeholder:text-slate-400 focus:outline-none md:col-span-2" />
                    <button type="submit" class="premium-btn-primary w-full rounded-lg px-3 py-1.5 text-xs font-semibold md:col-span-2">
                      Shto produkt
                    </button>
                  </form>
                </div>

                <div id="owner-import-file-panel" class="space-y-3">
                  <button type="button" data-action="open-import-picker" class="w-full rounded-xl border border-dashed border-blue-200 bg-blue-50/70 px-4 py-4 text-left hover:bg-blue-50">
                    <div class="text-xs font-semibold text-blue-800">Zgjidh file për import (Excel/CSV)</div>
                    <div class="mt-1 text-[11px] text-blue-700">Mbështetet: .csv, .xlsx, .xls</div>
                  </button>
                  <div id="owner-import-preview" class="mb-1"></div>
                </div>
              </div>

              <div class="premium-card p-4">
                <div class="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <h3 class="text-base font-semibold text-slate-900">Produkte ekzistuese</h3>
                  <span class="text-[11px] text-slate-500">Shfaqur: <span id="owner-products-count">${products.length}</span></span>
                </div>
                <div class="mb-2 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                  <label class="flex items-center gap-1.5 text-[11px] text-slate-600 whitespace-nowrap">
                    <span class="text-slate-500">Shfaq:</span>
                    <select id="owner-products-category-filter" class="premium-input rounded-lg px-2 py-1 text-xs focus:outline-none max-w-44" aria-label="Filtro sipas kategorisë së produktit">
                      <option value="barna" ${selIfImportCat('barna')}>Vetëm barna</option>
                      <option value="all" ${selIfImportCat('all')}>Barna + front</option>
                      <option value="front" ${selIfImportCat('front')}>Vetëm front</option>
                    </select>
                  </label>
                </div>
                <div class="mb-2 grid gap-2 md:grid-cols-[1fr_auto]">
                  <input id="owner-products-search" type="text" placeholder="Kërko sipas emrit, furnitorit ose emrave alternativë..." class="premium-input w-full rounded-lg px-2.5 py-1.5 text-xs placeholder:text-slate-400 focus:outline-none" />
                  <select id="owner-products-sort" class="premium-input rounded-lg px-2.5 py-1.5 text-xs focus:outline-none">
                    <option value="name">Rendit: Emri</option>
                    <option value="supplier">Rendit: Furnitori</option>
                    <option value="category">Rendit: Kategoria</option>
                  </select>
                </div>
                <ul id="owner-products-list" class="max-h-56 overflow-auto pr-1"></ul>
              </div>
          </div>
        </section>
      </main>
    </div>
  `

  const accountMenuBtn = document.getElementById('owner-account-menu-btn') as HTMLButtonElement | null
  const accountMenu = document.getElementById('owner-account-menu') as HTMLDivElement | null
  const accountLogout = document.getElementById('owner-account-logout') as HTMLButtonElement | null
  const navToggle = document.getElementById('owner-nav-toggle') as HTMLButtonElement | null
  const navLogoReopen = document.getElementById('owner-logo-reopen') as HTMLButtonElement | null
  const shell = document.getElementById('owner-shell') as HTMLElement | null
  const sidebar = document.getElementById('owner-sidebar') as HTMLElement | null
  const sidebarBackdrop = document.getElementById('owner-sidebar-backdrop') as HTMLDivElement | null

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

  accountMenuBtn?.addEventListener('click', (e) => {
    e.stopPropagation()
    accountMenu?.classList.toggle('hidden')
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
  const topSearchInput = document.getElementById('owner-top-search') as HTMLInputElement | null
  const sortSelect = document.getElementById('owner-sort') as HTMLSelectElement | null
  const productForm = document.getElementById('owner-product-form') as HTMLFormElement | null
  const productNameInput = document.getElementById('owner-product-name') as HTMLInputElement | null
  const productSupplierInput = document.getElementById('owner-product-supplier') as HTMLInputElement | null
  const productCategoryInput = document.getElementById('owner-product-category') as HTMLSelectElement | null
  const productAliasesInput = document.getElementById('owner-product-aliases') as HTMLInputElement | null
  const importInput = document.getElementById('import-csv-input') as HTMLInputElement | null
  const productSearchInput = document.getElementById('owner-products-search') as HTMLInputElement | null
  const productSortSelect = document.getElementById('owner-products-sort') as HTMLSelectElement | null

  const applySearch = (value: string): void => {
    searchQuery = value
    if (searchInput && searchInput.value !== value) searchInput.value = value
    if (topSearchInput && topSearchInput.value !== value) topSearchInput.value = value
    refreshUI()
  }

  searchInput?.addEventListener('input', () => applySearch(searchInput.value))
  topSearchInput?.addEventListener('input', () => applySearch(topSearchInput.value))

  const applyShortageSortFromSelect = (el: HTMLSelectElement): void => {
    sortBy = el.value === 'name' ? 'name' : 'supplier'
    persistShortageSort(sortBy)
    refreshUI()
  }

  shell?.addEventListener('change', (e) => {
    const t = e.target
    if (!(t instanceof HTMLSelectElement)) return
    if (t.id === 'owner-sort') {
      applyShortageSortFromSelect(t)
      return
    }
    if (t.id === 'owner-products-sort') {
      productSortBy = t.value === 'supplier' || t.value === 'category' ? t.value : 'name'
      refreshUI()
      return
    }
    if (t.id === 'owner-products-category-filter') {
      ownerProductCategoryFilter =
        t.value === 'front' ? 'front' : t.value === 'all' ? 'all' : 'barna'
      refreshUI()
    }
  })
  if (sortSelect) sortSelect.value = sortBy === 'name' ? 'name' : 'supplier'
  if (productSortSelect) productSortSelect.value = productSortBy
  productSearchInput?.addEventListener('input', () => {
    productQuery = productSearchInput.value
    refreshUI()
  })

  productForm?.addEventListener('submit', async (event) => {
    event.preventDefault()
    const name = productNameInput?.value ?? ''
    const supplier = productSupplierInput?.value ?? ''
    const category = (productCategoryInput?.value === 'front' ? 'front' : 'barna')
    const aliases = parseAliasesInput(productAliasesInput?.value ?? '')

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

  importInput?.addEventListener('change', async () => {
    const file = importInput.files?.[0]
    if (!file) return
    lastImportFileName = file.name
    importTab = 'file'
    let rows: ImportRow[] = []
    const issues: string[] = []

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
        rows = jsonRows
          .map((r, i): ImportRow | null => {
            const name = pickByKeys(r, ['name', 'emri', 'produkti', 'barna', 'bari'])
            const supplier = pickByKeys(r, ['supplier', 'suppliername', 'supplier_name', 'furnitori'])
            if (!name || !supplier) {
              issues.push(`Excel rreshti ${i + 2}: mungon name ose supplier_name`)
              return null
            }
            const categoryRaw = pickByKeys(r, ['category', 'kategoria', 'tipi']).toLocaleLowerCase('sq-AL')
            const priceRaw = pickByKeys(r, ['lastpaidprice', 'last_paid_price', 'cmimifundit', 'cmimiifundit'])
            const dateRaw = pickByKeys(r, ['lastpricedate', 'last_price_date', 'datacmimit'])
            const defQtyRaw = pickByKeys(r, ['defaultorderqty', 'default_order_qty', 'defaultsasi'])
            const lastPaidPrice = parsePositiveNumber(priceRaw)
            const lastPriceDate = parseDateIso(dateRaw)
            const defaultOrderQty = parsePositiveInteger(defQtyRaw)
            if (priceRaw && lastPaidPrice === undefined) {
              issues.push(`Excel rreshti ${i + 2}: last_paid_price e pavlefshme (“${priceRaw}”)`)
            }
            if (dateRaw && lastPriceDate === undefined) {
              issues.push(`Excel rreshti ${i + 2}: last_price_date e pavlefshme (“${dateRaw}”)`)
            }
            if (defQtyRaw && defaultOrderQty === undefined) {
              issues.push(`Excel rreshti ${i + 2}: default_order_qty e pavlefshme (“${defQtyRaw}”)`)
            }
            return {
              name,
              supplier,
              producerName: pickByKeys(r, ['producername', 'producer_name', 'prodhuesi', 'prodhues']),
              lastPaidPrice,
              lastPriceDate,
              defaultOrderQty,
              category: parseCategory(categoryRaw),
              aliases: pickByKeys(r, ['emraalternative', 'emra_alternative', 'emraalternativ', 'aliases', 'alias', 'sinonime'])
                .split(/[|,]/)
                .map((a) => a.trim())
                .filter(Boolean),
            }
          })
          .filter((r): r is ImportRow => Boolean(r))
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
      const headers = splitCsvLine(lines[0]).map((h) => normalizeHeader(h))
      rows = lines
        .slice(1)
        .map((row, i): ImportRow | null => {
          const cols = splitCsvLine(row)
          const rowObj: Record<string, unknown> = {}
          headers.forEach((h, idx) => {
            rowObj[h] = cols[idx] ?? ''
          })
          const name = pickByKeys(rowObj, ['name', 'emri', 'produkti', 'barna', 'bari'])
          const supplier = pickByKeys(rowObj, ['supplier', 'suppliername', 'supplier_name', 'furnitori'])
          if (!name || !supplier) {
            issues.push(`CSV rreshti ${i + 2}: mungon name ose supplier_name`)
            return null
          }
          const categoryRaw = pickByKeys(rowObj, ['category', 'kategoria', 'tipi'])
          const priceRaw = pickByKeys(rowObj, ['lastpaidprice', 'last_paid_price', 'cmimifundit', 'cmimiifundit'])
          const dateRaw = pickByKeys(rowObj, ['lastpricedate', 'last_price_date', 'datacmimit'])
          const defQtyRaw = pickByKeys(rowObj, ['defaultorderqty', 'default_order_qty', 'defaultsasi'])
          const lastPaidPrice = parsePositiveNumber(priceRaw)
          const lastPriceDate = parseDateIso(dateRaw)
          const defaultOrderQty = parsePositiveInteger(defQtyRaw)
          if (priceRaw && lastPaidPrice === undefined) {
            issues.push(`CSV rreshti ${i + 2}: last_paid_price e pavlefshme (“${priceRaw}”)`)
          }
          if (dateRaw && lastPriceDate === undefined) {
            issues.push(`CSV rreshti ${i + 2}: last_price_date e pavlefshme (“${dateRaw}”)`)
          }
          if (defQtyRaw && defaultOrderQty === undefined) {
            issues.push(`CSV rreshti ${i + 2}: default_order_qty e pavlefshme (“${defQtyRaw}”)`)
          }
          return {
            name,
            supplier,
            producerName: pickByKeys(rowObj, ['producername', 'producer_name', 'prodhuesi', 'prodhues']),
            lastPaidPrice,
            lastPriceDate,
            defaultOrderQty,
            category: parseCategory(categoryRaw),
            aliases: pickByKeys(rowObj, ['emraalternative', 'emra_alternative', 'emraalternativ', 'aliases', 'alias', 'sinonime'])
              .split(/[|,]/)
              .map((a) => a.trim())
              .filter(Boolean),
          }
        })
        .filter((r): r is ImportRow => Boolean(r))
    }

    if (!rows.length && !issues.length) {
      showToast('Nuk u gjetën rreshta valide për import.')
      importInput.value = ''
      return
    }
    pendingImportRows = rows
    pendingImportIssues = issues
    refreshUI()
    showToast(`Preview gati: ${rows.length} valid, ${issues.length} me gabime.`)
  })

  const handleContainerClick = async (event: MouseEvent): Promise<void> => {
    const target = event.target as HTMLElement
    const btn = target.closest<HTMLButtonElement>('button[data-action]')
    if (!btn) return

    const action = btn.dataset.action
    const id = btn.dataset.id
    const productId = btn.dataset.productId

    if (action === 'switch-import-tab') {
      const tab = btn.dataset.tab === 'manual' ? 'manual' : 'file'
      importTab = tab
      refreshUI()
      return
    }

    if (action === 'open-import-picker') {
      importInput?.click()
      return
    }

    if (action === 'increment' && id) {
      shortages = shortages.map((s) =>
        s.id === id ? { ...s, suggestedQty: Math.max(1, s.suggestedQty + 1) } : s
      )
      persistSuggestedQtyDraft(shortages)
      refreshUI()
      return
    }

    if (action === 'decrement' && id) {
      shortages = shortages.map((s) =>
        s.id === id ? { ...s, suggestedQty: Math.max(1, s.suggestedQty - 1) } : s
      )
      persistSuggestedQtyDraft(shortages)
      refreshUI()
      return
    }

    if (action === 'copy') {
      const order = resolveOrderFromBtn(btn)
      if (!order) return
      const orderId = order.id
      const text = buildReceipt(order)
      try {
        await navigator.clipboard.writeText(text)
        showToast('U kopjua!')
      } catch {
        setOrderStatus(orderId, 'FAILED', order.dbId)
        refreshUI()
        showToast('Kopjimi dështoi.')
      }
      return
    }

    if (action === 'download-pdf') {
      const order = resolveOrderFromBtn(btn)
      if (!order) return
      const orderId = order.id
      try {
        await downloadOrderPdf(order)
        showToast('PDF u shkarkua.')
      } catch {
        setOrderStatus(orderId, 'FAILED', order.dbId)
        refreshUI()
        showToast('Shkarkimi i PDF dështoi.')
      }
      return
    }

    if (action === 'whatsapp') {
      const order = resolveOrderFromBtn(btn)
      if (!order) return
      const orderId = order.id
      const phones = getSupplierPhones()
      const typedPhone = await openWhatsAppPhoneModal(order.supplier, phones[order.supplier] ?? '')
      if (typedPhone == null) return
      const phone = normalizePhone(typedPhone)
      if (phone.length < 8) {
        setOrderStatus(orderId, 'FAILED', order.dbId)
        refreshUI()
        showToast('Numri i WhatsApp nuk është valid.')
        return
      }
      phones[order.supplier] = phone
      setSupplierPhones(phones)
      const text = buildReceipt(order)
      const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
      window.open(url, '_blank', 'noopener,noreferrer')
      showToast('WhatsApp u hap me reciptin — dërgojeni furnitorit.')
      return
    }

    if (action === 'mark-sent') {
      const order = resolveOrderFromBtn(btn)
      if (!order) return
      const orderId = order.id
      if (order.status === 'SENT') {
        showToast('Porosia është tashmë E dërguar.')
        return
      }
      try {
        const updated = await markOrderAsSent(order)
        setOrderStatus(orderId, updated.status, order.dbId)
        refreshUI()
        showToast('Porosia u shënua si E dërguar (status SENT).')
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Dështoi shënimi si dërguar.'
        showToast(msg.length > 120 ? `${msg.slice(0, 117)}…` : msg)
      }
      return
    }

    if (action === 'edit-note' && id) {
      const current = shortages.find((s) => s.id === id)
      if (!current) return
      const edited = await openShortageEditModal(current)
      if (!edited) return
      try {
        shortages = shortages.map((s) =>
          s.id === id ? { ...s, suggestedQty: Math.max(1, edited.suggestedQty) } : s
        )
        shortages = applySuggestedQtyDraft(await updateShortageMeta(id, { note: edited.note, urgent: edited.urgent }))
        shortages = shortages.map((s) =>
          s.id === id ? { ...s, suggestedQty: Math.max(1, edited.suggestedQty) } : s
        )
        persistSuggestedQtyDraft(shortages)
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
        persistSuggestedQtyDraft(shortages)
        refreshUI()
        showToast('Mungesa u fshi.')
      } catch {
        showToast('Fshirja dështoi.')
      }
      return
    }

    if (action === 'edit-product' && productId) {
      const current = products.find((p) => p.id === productId)
      if (!current) return
      const edited = await openProductEditModal(current)
      if (!edited) return
      const result = await updateProduct({
        id: current.id,
        name: edited.name,
        supplier: edited.supplier,
        category: edited.category,
        aliases: edited.aliases,
      })
      if (!result.ok) {
        showToast(result.message)
        return
      }
      products = await getProducts()
      refreshUI()
      showToast('Produkti u përditësua.')
      return
    }

    if (action === 'delete-product' && productId) {
      const current = products.find((p) => p.id === productId)
      if (!current) return
      const yes = await openConfirmModal(
        'Fshirja e produktit',
        `A je i sigurt që do ta fshish produktin "${current.name}"?`
      )
      if (!yes) return
      const result = await deleteProduct(productId)
      if (!result.ok) {
        showToast(result.message)
        return
      }
      products = await getProducts()
      refreshUI()
      showToast('Produkti u fshi.')
      return
    }

    if (action === 'apply-import') {
      if (!pendingImportRows.length) {
        showToast('Nuk ka rreshta valid për import.')
        return
      }
      let okCount = 0
      let failCount = 0
      for (const row of pendingImportRows) {
        const result = await addProduct({
          name: row.name,
          supplier: row.supplier,
          category: row.category,
          aliases: row.aliases,
          producerName: row.producerName,
          lastPaidPrice: row.lastPaidPrice,
          lastPriceDate: row.lastPriceDate,
          defaultOrderQty: row.defaultOrderQty,
        })
        if (result.ok) okCount += 1
        else failCount += 1
      }
      products = await getProducts()
      pendingImportRows = []
      pendingImportIssues = []
      lastImportFileName = ''
      if (importInput) importInput.value = ''
      refreshUI()
      showToast(`Import u aplikua: ${okCount} OK, ${failCount} dështuan.`)
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
  }
  container.onclick = (event) => {
    void handleContainerClick(event as MouseEvent)
  }

  const generateBtn = document.getElementById('btn-generate-orders-today') as HTMLButtonElement | null
  generateBtn?.addEventListener('click', async () => {
    generatedOrders = await generateOrdersFromShortages(getFilteredRows())
    clearSuggestedQtyDraft()
    refreshUI()
    showToast('Porositë e ditës së sotme u gjeneruan.')
    document.getElementById('owner-orders-panel')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  })

  Promise.all([getTodayShortages(), getProducts(), loadAccountInfo()]).then(
    ([rows, productRows, _account]) => {
      shortages = applySuggestedQtyDraft(rows)
      products = productRows
      generatedOrders = []
      refreshUI()
    }
  )

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
