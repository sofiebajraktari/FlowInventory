import { isSupabaseConfigured, supabase } from './supabase.js'
import {
  addProduct as addProductMock,
  addShortage as addShortageMock,
  buildOrdersFromShortages as buildOrdersFromShortagesMock,
  deleteShortage as deleteShortageMock,
  getProducts as getProductsMock,
  getShortages as getShortagesMock,
  updateShortageMeta as updateShortageMetaMock,
  updateSuggestedQty as updateSuggestedQtyMock,
  type MissingItem as MockMissingItem,
  type MockProduct,
} from './mockData.js'

export interface OwnerOrder {
  id: number
  dbId?: string
  supplier: string
  items: string[]
  status?: 'DRAFT' | 'SENT'
}

export interface ProductView {
  id: string
  name: string
  genericName?: string
  supplierId?: string
  supplierName: string
  category: 'barna' | 'front'
  aliases: string[]
}

export interface ShortageView {
  id: string
  productId: string
  productName: string
  supplierId?: string
  supplierName: string
  urgent: boolean
  note: string
  addedCount: number
  suggestedQty: number
}

function todayIso(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function stableOrderUiId(id: string, fallback: number): number {
  const compact = (id ?? '').replace(/-/g, '')
  const head = compact.slice(0, 8)
  const parsed = Number.parseInt(head, 16)
  if (Number.isFinite(parsed) && parsed > 0) return (parsed % 900000) + 100000
  return fallback
}

function fromMockShortages(rows: MockMissingItem[]): ShortageView[] {
  return rows.map((r) => ({
    id: r.id,
    productId: r.product.id,
    productName: r.product.name,
    supplierName: r.product.supplier,
    urgent: r.urgent,
    note: r.note,
    addedCount: r.addedCount,
    suggestedQty: r.suggestedQty,
  }))
}

function fromMockProducts(rows: MockProduct[]): ProductView[] {
  return rows.map((p) => ({
    id: p.id,
    name: p.name,
    genericName: undefined,
    supplierName: p.supplier,
    category: p.category,
    aliases: p.aliases ?? [],
  }))
}

export async function getProducts(): Promise<ProductView[]> {
  if (!isSupabaseConfigured) return fromMockProducts(getProductsMock())

  const { data, error } = await supabase
    .from('products')
    .select('id,name,generic_name,category,aliases,supplier_id,suppliers(name)')
    .order('name')

  if (error || !data) return []

  return data.map((row: any) => ({
    id: row.id,
    name: row.name,
    genericName: row.generic_name ?? undefined,
    supplierId: row.supplier_id ?? undefined,
    supplierName: row.suppliers?.name ?? 'Pa furnitor',
    category: row.category === 'front' ? 'front' : 'barna',
    aliases: Array.isArray(row.aliases) ? row.aliases : [],
  }))
}

export async function addProduct(input: {
  name: string
  supplier: string
  category: 'barna' | 'front'
  aliases: string[]
}): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!isSupabaseConfigured) {
    const result = addProductMock({
      name: input.name,
      supplier: input.supplier,
      category: input.category,
      aliases: input.aliases,
    })
    return result.ok ? { ok: true } : result
  }

  const name = input.name.trim()
  const supplierName = input.supplier.trim()
  if (!name) return { ok: false, message: 'Shkruaj emrin e barit.' }
  if (!supplierName) return { ok: false, message: 'Shkruaj furnitorin.' }

  let supplierId: string | null = null
  const supplierRes = await supabase
    .from('suppliers')
    .select('id,name')
    .ilike('name', supplierName)
    .limit(1)
    .maybeSingle()

  if (supplierRes.data?.id) {
    supplierId = supplierRes.data.id
  } else {
    const insertSupplier = await supabase
      .from('suppliers')
      .insert({ name: supplierName })
      .select('id')
      .single()
    if (insertSupplier.error || !insertSupplier.data?.id) {
      return { ok: false, message: insertSupplier.error?.message ?? 'Nuk u krijua furnitori.' }
    }
    supplierId = insertSupplier.data.id
  }

  const insertProduct = await supabase.from('products').insert({
    name,
    supplier_id: supplierId,
    category: input.category,
    aliases: input.aliases,
    default_order_qty: 1,
  })
  if (insertProduct.error) return { ok: false, message: insertProduct.error.message }

  return { ok: true }
}

export async function addMungese(productId: string, urgent: boolean, note: string): Promise<void> {
  if (!isSupabaseConfigured) {
    addShortageMock(productId, urgent, note)
    return
  }
  const { error } = await supabase.rpc('add_mungese', {
    p_product_id: productId,
    p_urgent: urgent,
    p_note: note,
  })
  if (error) throw error
}

export async function getTodayShortages(): Promise<ShortageView[]> {
  if (!isSupabaseConfigured) return fromMockShortages(getShortagesMock())

  const [productsRes, shortagesRes] = await Promise.all([
    getProducts(),
    supabase
      .from('mungesat')
      .select('id,product_id,urgent,note,added_count')
      .eq('entry_date', todayIso())
      .order('created_at', { ascending: false }),
  ])

  if (shortagesRes.error || !shortagesRes.data) return []
  const productMap = new Map(productsRes.map((p) => [p.id, p]))

  return shortagesRes.data.map((row: any) => {
    const product = productMap.get(row.product_id)
    return {
      id: row.id,
      productId: row.product_id,
      productName: product?.name ?? 'Produkt',
      supplierId: product?.supplierId,
      supplierName: product?.supplierName ?? 'Pa furnitor',
      urgent: Boolean(row.urgent),
      note: row.note ?? '',
      addedCount: Number(row.added_count ?? 1),
      suggestedQty: Math.max(1, Number(row.added_count ?? 1)),
    }
  })
}

export async function updateSuggestedQty(id: string, delta: number): Promise<ShortageView[]> {
  if (!isSupabaseConfigured) {
    const rows = updateSuggestedQtyMock(id, delta)
    return fromMockShortages(rows)
  }

  // Në DB suggested qty ruhet vetëm te order_items, prandaj këtu e mbajmë vetëm në memory.
  // Kthejmë gjendjen aktuale pa persist për para-gjenerim.
  const rows = await getTodayShortages()
  return rows.map((r) =>
    r.id === id ? { ...r, suggestedQty: Math.max(1, r.suggestedQty + delta) } : r
  )
}

export async function updateShortageMeta(
  id: string,
  patch: { urgent?: boolean; note?: string }
): Promise<ShortageView[]> {
  if (!isSupabaseConfigured) {
    const rows = updateShortageMetaMock(id, patch)
    return fromMockShortages(rows)
  }

  const payload: Record<string, unknown> = {}
  if (typeof patch.urgent === 'boolean') payload.urgent = patch.urgent
  if (typeof patch.note === 'string') payload.note = patch.note
  if (!Object.keys(payload).length) return getTodayShortages()

  const { error } = await supabase.from('mungesat').update(payload).eq('id', id)
  if (error) throw error
  return getTodayShortages()
}

export async function deleteShortage(id: string): Promise<ShortageView[]> {
  if (!isSupabaseConfigured) {
    const rows = deleteShortageMock(id)
    return fromMockShortages(rows)
  }
  const { error } = await supabase.from('mungesat').delete().eq('id', id)
  if (error) throw error
  return getTodayShortages()
}

export async function generateOrdersFromShortages(rows: ShortageView[]): Promise<OwnerOrder[]> {
  if (!isSupabaseConfigured) {
    const mockRows: MockMissingItem[] = rows.map((r) => ({
      id: r.id,
      urgent: r.urgent,
      note: r.note,
      addedCount: r.addedCount,
      suggestedQty: r.suggestedQty,
      product: {
        id: r.productId,
        name: r.productName,
        supplier: r.supplierName,
        category: 'barna',
      },
    }))
    return buildOrdersFromShortagesMock(mockRows)
  }

  const { data: authData } = await supabase.auth.getUser()
  const userId = authData.user?.id
  if (!userId) throw new Error('User jo i kyçur.')

  const grouped = new Map<string, ShortageView[]>()
  rows
    .filter((r) => r.suggestedQty > 0)
    .forEach((r) => {
      const key = r.supplierId ?? `fallback:${r.supplierName}`
      const current = grouped.get(key) ?? []
      current.push(r)
      grouped.set(key, current)
    })

  const created: OwnerOrder[] = []

  for (const [key, items] of grouped.entries()) {
    let supplierId = items[0].supplierId
    if (!supplierId) {
      const supplierName = items[0].supplierName
      const supplierRes = await supabase
        .from('suppliers')
        .select('id')
        .ilike('name', supplierName)
        .limit(1)
        .maybeSingle()
      supplierId = supplierRes.data?.id ?? null
      if (!supplierId) {
        const ins = await supabase.from('suppliers').insert({ name: supplierName }).select('id').single()
        supplierId = ins.data?.id ?? null
      }
    }
    if (!supplierId) continue

    const orderInsert = await supabase
      .from('orders')
      .insert({
        supplier_id: supplierId,
        status: 'DRAFT',
        created_by: userId,
      })
      .select('id')
      .single()
    if (orderInsert.error || !orderInsert.data?.id) continue

    const orderId = orderInsert.data.id
    const orderItemsPayload = items.map((r) => ({
      order_id: orderId,
      product_id: r.productId,
      suggested_qty: r.suggestedQty,
      final_qty: r.suggestedQty,
      note: r.note ?? '',
    }))
    await supabase.from('order_items').insert(orderItemsPayload)

    const renderedItems = items.map(
      (r) => `${r.suggestedQty} ${r.productName}${r.urgent ? ' URGJENT' : ''}`
    )
    const receipt = `FARMACIA VALDET
POROSI MUNGESASH
Data: ${new Date().toLocaleString('sq-AL')}
Furnitori: ${items[0].supplierName}
ID: ${orderId}
---------------------------
${renderedItems.join('\n')}
Shënim: Ju lutem konfirmoni disponueshmërinë dhe kohën e dorëzimit.`

    await supabase.from('orders').update({ receipt_text: receipt }).eq('id', orderId)

    created.push({
      id: stableOrderUiId(orderId, created.length + 100),
      dbId: orderId,
      supplier: items[0].supplierName,
      items: items.map((r) => `${r.suggestedQty} × ${r.productName}${r.urgent ? ' (URGJENT)' : ''}`),
      status: 'DRAFT',
    })
  }

  return created
}

export async function getRecentOrders(limit = 20): Promise<OwnerOrder[]> {
  if (!isSupabaseConfigured) return []

  const { data, error } = await supabase
    .from('orders')
    .select('id,status,suppliers(name),order_items(final_qty,suggested_qty,products(name))')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error || !data) return []

  return data.map((row: any, idx: number) => {
    const orderItems = Array.isArray(row.order_items) ? row.order_items : []
    const items = orderItems.map((it: any) => {
      const qty = Number(it.final_qty ?? it.suggested_qty ?? 1)
      const productName = it.products?.name ?? 'Produkt'
      return `${qty} × ${productName}`
    })
    const dbId = String(row.id)
    return {
      id: stableOrderUiId(dbId, 1000 + idx),
      dbId,
      supplier: row.suppliers?.name ?? 'Pa furnitor',
      items,
      status: row.status === 'SENT' ? 'SENT' : 'DRAFT',
    } satisfies OwnerOrder
  })
}

export async function markOrderAsSent(order: OwnerOrder): Promise<OwnerOrder> {
  if (!isSupabaseConfigured || !order.dbId) {
    return { ...order, status: 'SENT' }
  }
  const { error } = await supabase
    .from('orders')
    .update({ status: 'SENT', sent_at: new Date().toISOString() })
    .eq('id', order.dbId)
  if (error) throw error
  return { ...order, status: 'SENT' }
}

