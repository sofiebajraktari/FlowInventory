export type ProductCategory = 'barna' | 'front'

export interface MockProduct {
  id: string
  name: string
  supplier: string
  category: ProductCategory
  aliases?: string[]
}

export interface MissingItem {
  id: string
  product: MockProduct
  urgent: boolean
  note: string
  addedCount: number
  suggestedQty: number
}

export interface OwnerOrder {
  id: number
  supplier: string
  items: string[]
}

const STORAGE_KEY = 'flowinventory_mock_shortages'
const PRODUCTS_STORAGE_KEY = 'flowinventory_mock_products'

export const MOCK_PRODUCTS: MockProduct[] = [
  { id: '1', name: 'AUGMENTIN 1g TAB 14', supplier: 'DONIKA', category: 'barna', aliases: ['augmentin', 'amoksiklav'] },
  { id: '2', name: 'BRUFEN 400mg TAB 20', supplier: 'ABCOM', category: 'barna', aliases: ['brufen', 'ibuprofen'] },
  { id: '3', name: 'PARACETAMOL 500mg TAB 10', supplier: 'ABCOM', category: 'barna', aliases: ['paracetamol', 'dafalgan'] },
  { id: '4', name: 'VITAMIN C 500mg', supplier: 'VITA', category: 'front', aliases: ['vit c'] },
]

function normalize(text: string): string {
  return text.toLocaleLowerCase('sq-AL').trim()
}

function ensureProductsSeeded(): MockProduct[] {
  try {
    const raw = localStorage.getItem(PRODUCTS_STORAGE_KEY)
    if (raw) return JSON.parse(raw) as MockProduct[]
    localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(MOCK_PRODUCTS))
    return [...MOCK_PRODUCTS]
  } catch {
    return [...MOCK_PRODUCTS]
  }
}

export function getProducts(): MockProduct[] {
  return ensureProductsSeeded()
}

export function searchProducts(query: string): MockProduct[] {
  const q = normalize(query)
  if (!q) return []
  return getProducts().filter((p) => {
    if (normalize(p.name).includes(q)) return true
    if (p.aliases?.some((a) => normalize(a).includes(q))) return true
    return false
  }).slice(0, 8)
}

export function addProduct(input: {
  name: string
  supplier: string
  category: ProductCategory
  aliases?: string[]
}): { ok: true; products: MockProduct[] } | { ok: false; message: string } {
  const name = input.name.trim()
  const supplier = input.supplier.trim()
  if (!name) return { ok: false, message: 'Shkruaj emrin e barit.' }
  if (!supplier) return { ok: false, message: 'Shkruaj furnitorin.' }

  const products = getProducts()
  const exists = products.some(
    (p) => normalize(p.name) === normalize(name) && normalize(p.supplier) === normalize(supplier)
  )
  if (exists) return { ok: false, message: 'Ky bar ekziston për këtë furnitor.' }

  const next: MockProduct = {
    id: crypto.randomUUID(),
    name,
    supplier,
    category: input.category,
    aliases: input.aliases?.filter(Boolean),
  }
  const updated = [next, ...products]
  localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(updated))
  return { ok: true, products: updated }
}

export function getShortages(): MissingItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as MissingItem[]
  } catch {
    return []
  }
}

function setShortages(items: MissingItem[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

export function addShortage(productId: string, urgent: boolean, note: string): MissingItem[] {
  const product = getProducts().find((p) => p.id === productId)
  if (!product) return getShortages()

  const items = getShortages()
  const existing = items.find((m) => m.product.id === product.id)
  const incomingNote = note.trim()

  if (existing) {
    existing.addedCount += 1
    existing.urgent = existing.urgent || urgent
    existing.suggestedQty = Math.max(existing.suggestedQty, existing.addedCount)
    if (incomingNote) {
      existing.note = existing.note ? `${existing.note} | ${incomingNote}` : incomingNote
    }
  } else {
    items.push({
      id: crypto.randomUUID(),
      product,
      urgent,
      note: incomingNote,
      addedCount: 1,
      suggestedQty: 1,
    })
  }

  setShortages(items)
  return items
}

export function updateSuggestedQty(id: string, delta: number): MissingItem[] {
  const items = getShortages()
  const row = items.find((i) => i.id === id)
  if (!row) return items
  row.suggestedQty = Math.max(1, row.suggestedQty + delta)
  setShortages(items)
  return items
}

export function buildOrdersFromShortages(rows: MissingItem[]): OwnerOrder[] {
  const groups = new Map<string, MissingItem[]>()
  rows
    .filter((r) => r.suggestedQty > 0)
    .forEach((r) => {
      const current = groups.get(r.product.supplier) ?? []
      current.push(r)
      groups.set(r.product.supplier, current)
    })

  const sortedSuppliers = [...groups.keys()].sort((a, b) => a.localeCompare(b, 'sq-AL'))
  return sortedSuppliers.map((supplier, idx) => {
    const items = (groups.get(supplier) ?? []).map(
      (r) => `${r.suggestedQty} × ${r.product.name}${r.urgent ? ' (URGJENT)' : ''}`
    )
    return { id: 100 + idx, supplier, items }
  })
}

