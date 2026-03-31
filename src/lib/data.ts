import { isSupabaseConfigured, supabase } from './supabase.js'
import {
  addProduct as addProductMock,
  deleteProduct as deleteProductMock,
  addShortage as addShortageMock,
  buildOrdersFromShortages as buildOrdersFromShortagesMock,
  deleteShortage as deleteShortageMock,
  getProducts as getProductsMock,
  updateProduct as updateProductMock,
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
  status?: 'DRAFT' | 'SENT' | 'FAILED'
}

export interface ProductView {
  id: string
  name: string
  genericName?: string
  defaultOrderQty?: number
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
  createdById?: string
  createdByRole?: 'OWNER' | 'MANAGER' | 'WORKER'
  createdByLabel?: string
}

export interface SupplierView {
  id: string
  name: string
  productCount: number
}

export interface CompanyDetails {
  name: string
  posName: string
  address: string
  phone: string
  email: string
  logoUrl: string
  otherInfo: string
}

export interface DashboardInsights {
  shortageTrend: Array<{ date: string; count: number }>
  topSuppliers: Array<{ name: string; count: number }>
  topProducts: Array<{ name: string; count: number }>
  urgentBreakdown: { urgent: number; normal: number }
  weekdayTrend: Array<{ day: string; count: number }>
}

function shiftIsoDays(base: Date, offsetDays: number): string {
  const d = new Date(base)
  d.setDate(d.getDate() + offsetDays)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

async function resolveCurrentCompanyId(): Promise<string | null> {
  if (!isSupabaseConfigured) return null
  const { data: authData } = await supabase.auth.getUser()
  const user = authData.user
  const userId = user?.id
  if (!userId) return null

  const currentCompany = await supabase.rpc('current_company_id')
  if (!currentCompany.error) {
    const companyId = String(currentCompany.data ?? '').trim()
    if (companyId) return companyId
  }

  const username =
    String(user.user_metadata?.username ?? '').trim().toLocaleLowerCase('sq-AL') ||
    String(user.email ?? '').split('@')[0].trim().toLocaleLowerCase('sq-AL') ||
    'owner'
  const roleMeta = String(user.user_metadata?.role ?? '').trim().toUpperCase()
  const canBootstrap = roleMeta === '' || roleMeta === 'OWNER' || roleMeta === 'MANAGER'
  if (!canBootstrap) return null

  const profileRes = await supabase
    .from('profiles')
    .select('company_id,role')
    .eq('id', userId)
    .maybeSingle()
  if (!profileRes.error && profileRes.data) {
    const companyId = String((profileRes.data as { company_id?: unknown }).company_id ?? '').trim()
    if (companyId) return companyId
    const role = String((profileRes.data as { role?: unknown }).role ?? '').trim().toUpperCase()
    if (role && role !== 'OWNER' && role !== 'MANAGER') return null
  }

  const codeFromMeta = String(user.user_metadata?.company_code ?? '').trim().toLocaleLowerCase('sq-AL')
  const rawCode = codeFromMeta || username || 'main'
  const companyCode = rawCode
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40) || 'main'
  const companyName =
    String(user.user_metadata?.company_name ?? '').trim() ||
    `Company ${username || 'Owner'}`

  let bootstrap = await supabase.rpc('bootstrap_company_owner', {
    p_company_name: companyName,
    p_company_code: companyCode,
    p_username: username,
  })
  if (bootstrap.error) {
    const msg = String(bootstrap.error.message ?? '')
    const codeTaken = /company_code_taken|duplicate|already exists/i.test(msg)
    if (codeTaken) {
      const uniqueCode = `${companyCode || 'main'}-${String(userId).replace(/-/g, '').slice(0, 6)}`
      bootstrap = await supabase.rpc('bootstrap_company_owner', {
        p_company_name: companyName,
        p_company_code: uniqueCode,
        p_username: username,
      })
    }
  }
  if (!bootstrap.error) {
    const createdCompanyId = String(bootstrap.data ?? '').trim()
    if (createdCompanyId) return createdCompanyId
  }

  const retryCurrentCompany = await supabase.rpc('current_company_id')
  if (!retryCurrentCompany.error) {
    const companyId = String(retryCurrentCompany.data ?? '').trim()
    if (companyId) return companyId
  }
  return null
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
    createdById: undefined,
    createdByRole: undefined,
    createdByLabel: undefined,
  }))
}

function fromMockProducts(rows: MockProduct[]): ProductView[] {
  return rows.map((p) => ({
    id: p.id,
    name: p.name,
    genericName: undefined,
    defaultOrderQty: 1,
    supplierName: p.supplier,
    category: p.category,
    aliases: p.aliases ?? [],
  }))
}

export async function getProducts(): Promise<ProductView[]> {
  if (!isSupabaseConfigured) return fromMockProducts(getProductsMock())

  const { data, error } = await supabase
    .from('products')
    .select('id,name,generic_name,default_order_qty,category,aliases,supplier_id,suppliers(name)')
    .order('name')

  if (error || !data) return []

  return data.map((row: any) => ({
    id: row.id,
    name: row.name,
    genericName: row.generic_name ?? undefined,
    defaultOrderQty: Number(row.default_order_qty ?? 1),
    supplierId: row.supplier_id ?? undefined,
    supplierName: row.suppliers?.name ?? 'Pa furnitor',
    category: row.category === 'front' ? 'front' : 'barna',
    aliases: Array.isArray(row.aliases) ? row.aliases : [],
  }))
}

export async function getSuppliers(): Promise<SupplierView[]> {
  if (!isSupabaseConfigured) {
    const grouped = new Map<string, number>()
    fromMockProducts(getProductsMock()).forEach((p) => {
      grouped.set(p.supplierName, (grouped.get(p.supplierName) ?? 0) + 1)
    })
    return [...grouped.entries()]
      .sort((a, b) => a[0].localeCompare(b[0], 'sq-AL'))
      .map(([name, count], idx) => ({ id: `mock-${idx}`, name, productCount: count }))
  }
  const { data, error } = await supabase
    .from('suppliers')
    .select('id,name,products(count)')
    .order('name')
  if (error || !data) return []
  return data.map((row: any) => ({
    id: String(row.id ?? ''),
    name: String(row.name ?? ''),
    productCount: Number(row.products?.[0]?.count ?? 0),
  }))
}

export async function addSupplier(name: string): Promise<{ ok: true } | { ok: false; message: string }> {
  const supplierName = name.trim()
  if (!supplierName) return { ok: false, message: 'Shkruaj emrin e furnitorit.' }
  if (!isSupabaseConfigured) return { ok: true }
  const existing = await supabase.from('suppliers').select('id').ilike('name', supplierName).limit(1).maybeSingle()
  if (existing.data?.id) return { ok: false, message: 'Ky furnitor ekziston.' }
  const ins = await supabase.from('suppliers').insert({ name: supplierName })
  if (ins.error) return { ok: false, message: ins.error.message }
  return { ok: true }
}

export async function renameSupplier(id: string, name: string): Promise<{ ok: true } | { ok: false; message: string }> {
  const supplierId = id.trim()
  const supplierName = name.trim()
  if (!supplierId) return { ok: false, message: 'ID e furnitorit mungon.' }
  if (!supplierName) return { ok: false, message: 'Shkruaj emrin e furnitorit.' }
  if (!isSupabaseConfigured) return { ok: true }
  const duplicate = await supabase.from('suppliers').select('id').ilike('name', supplierName).limit(1).maybeSingle()
  if (duplicate.data?.id && duplicate.data.id !== supplierId) {
    return { ok: false, message: 'Ekziston furnitor me këtë emër.' }
  }
  const up = await supabase.from('suppliers').update({ name: supplierName }).eq('id', supplierId)
  if (up.error) return { ok: false, message: up.error.message }
  return { ok: true }
}

export async function deleteSupplier(id: string): Promise<{ ok: true } | { ok: false; message: string }> {
  const supplierId = id.trim()
  if (!supplierId) return { ok: false, message: 'ID e furnitorit mungon.' }
  if (!isSupabaseConfigured) return { ok: true }
  const used = await supabase.from('products').select('id').eq('supplier_id', supplierId).limit(1).maybeSingle()
  if (used.data?.id) {
    return { ok: false, message: 'Furnitori ka produkte aktive. Hiqi ose ndrysho furnitorin e produkteve.' }
  }
  const del = await supabase.from('suppliers').delete().eq('id', supplierId)
  if (del.error) return { ok: false, message: del.error.message }
  return { ok: true }
}

export async function getPreferredProductByName(): Promise<Record<string, string>> {
  if (!isSupabaseConfigured) return {}
  const companyId = await resolveCurrentCompanyId()
  if (!companyId) return {}
  const { data, error } = await supabase
    .from('product_supplier_preferences')
    .select('product_name_norm,preferred_product_id')
    .eq('company_id', companyId)
  if (error || !data) return {}
  const out: Record<string, string> = {}
  for (const row of data as Array<{ product_name_norm?: unknown; preferred_product_id?: unknown }>) {
    const key = String(row.product_name_norm ?? '').trim().toLocaleLowerCase('sq-AL')
    const value = String(row.preferred_product_id ?? '').trim()
    if (key && value) out[key] = value
  }
  return out
}

export async function setPreferredProductByName(
  productName: string,
  productId: string,
  supplierId?: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const key = productName.trim().toLocaleLowerCase('sq-AL')
  const value = productId.trim()
  if (!key) return { ok: false, message: 'Emri i produktit mungon.' }
  if (!value) return { ok: false, message: 'Produkti i preferuar mungon.' }
  if (!isSupabaseConfigured) return { ok: true }
  const { data: authData } = await supabase.auth.getUser()
  const ownerId = authData.user?.id
  const companyId = await resolveCurrentCompanyId()
  if (!ownerId || !companyId) return { ok: false, message: 'User jo i kyçur.' }
  const upsert = await supabase.from('product_supplier_preferences').upsert(
    {
      company_id: companyId,
      owner_id: ownerId,
      product_name_norm: key,
      preferred_product_id: value,
      preferred_supplier_id: supplierId ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'company_id,product_name_norm' }
  )
  if (upsert.error) return { ok: false, message: upsert.error.message }
  return { ok: true }
}

export async function getCompanyDetails(): Promise<CompanyDetails> {
  const empty: CompanyDetails = { name: '', posName: '', address: '', phone: '', email: '', logoUrl: '', otherInfo: '' }
  if (!isSupabaseConfigured) return empty
  const companyId = await resolveCurrentCompanyId()
  if (!companyId) return empty
  const { data: authData } = await supabase.auth.getUser()
  const userEmail = String(authData.user?.email ?? '').trim()
  const companyRes = await supabase.from('companies').select('name').eq('id', companyId).maybeSingle()
  const companyName = String((companyRes.data as { name?: unknown } | null)?.name ?? '').trim()
  const fallback: CompanyDetails = {
    name: companyName,
    posName: companyName,
    address: '',
    phone: '',
    email: userEmail,
    logoUrl: '',
    otherInfo: '',
  }
  const { data, error } = await supabase
    .from('company_details')
    .select('name,pos_name,address,phone,email,logo_url,other_info')
    .eq('company_id', companyId)
    .order('updated_at', { ascending: false })
    .limit(1)
  if (error || !Array.isArray(data) || !data.length) return fallback
  const d = data[0] as Record<string, unknown>
  return {
    name: String(d.name ?? '').trim() || fallback.name,
    posName: String(d.pos_name ?? '').trim() || fallback.posName,
    address: String(d.address ?? '').trim() || fallback.address,
    phone: String(d.phone ?? '').trim() || fallback.phone,
    email: String(d.email ?? '').trim() || fallback.email,
    logoUrl: String(d.logo_url ?? '').trim() || fallback.logoUrl,
    otherInfo: String(d.other_info ?? '').trim() || fallback.otherInfo,
  }
}

export async function updateCompanyDetails(input: CompanyDetails): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!isSupabaseConfigured) return { ok: true }
  const companyId = await resolveCurrentCompanyId()
  if (!companyId) return { ok: false, message: 'User jo i kyçur.' }
  const { data: authData } = await supabase.auth.getUser()
  const userId = String(authData.user?.id ?? '').trim()
  const baseValues = {
    name: input.name.trim(),
    pos_name: input.posName.trim(),
    address: input.address.trim(),
    phone: input.phone.trim(),
    email: input.email.trim(),
    logo_url: input.logoUrl.trim(),
    other_info: input.otherInfo.trim(),
    updated_at: new Date().toISOString(),
  }
  const insertWithFallbacks = async (): Promise<{ ok: true } | { ok: false; message: string }> => {
    const insertCandidates: Array<Record<string, unknown>> = [
      {
        company_id: companyId,
        owner_id: userId || null,
        ...baseValues,
        branch_name: '',
        business_number: '',
      },
      {
        company_id: companyId,
        owner_id: userId || null,
        ...baseValues,
      },
      {
        owner_id: userId || null,
        ...baseValues,
      },
    ]
    for (const payload of insertCandidates) {
      const attempt = await supabase.from('company_details').insert(payload)
      if (!attempt.error) return { ok: true }
      const msg = String(attempt.error.message ?? '')
      const shouldTryNext =
        /column .* does not exist|branch_name|business_number|company_id|owner_id/i.test(msg)
      if (!shouldTryNext) return { ok: false, message: attempt.error.message }
    }
    return { ok: false, message: 'Nuk u ruajtën të dhënat e kompanisë.' }
  }

  const updateByCompany = await supabase
    .from('company_details')
    .update(baseValues)
    .eq('company_id', companyId)
    .select('company_id')
  if (!updateByCompany.error && Array.isArray(updateByCompany.data) && updateByCompany.data.length > 0) {
    return { ok: true }
  }

  if (updateByCompany.error) {
    const updateByOwner = await supabase
      .from('company_details')
      .update(baseValues)
      .eq('owner_id', userId)
      .select('owner_id')
    if (!updateByOwner.error && Array.isArray(updateByOwner.data) && updateByOwner.data.length > 0) {
      return { ok: true }
    }
    if (updateByOwner.error) {
      const msg = String(updateByOwner.error.message ?? '')
      const recoverable = /column .* does not exist|company_id|owner_id/i.test(msg)
      if (!recoverable) return { ok: false, message: updateByOwner.error.message }
    }
  }

  return insertWithFallbacks()
}

export async function adminCreateUser(input: {
  email?: string
  password: string
  username?: string
  role: 'OWNER' | 'MANAGER' | 'WORKER'
}): Promise<{ ok: true; userId: string } | { ok: false; message: string }> {
  const emailInput = String(input.email ?? '').trim().toLocaleLowerCase('sq-AL')
  const usernameInput = String(input.username ?? '').trim().toLocaleLowerCase('sq-AL')
  const email = emailInput || (usernameInput ? `${usernameInput}@flowinventory.local` : '')
  if (!email) return { ok: false, message: 'Email mungon.' }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, message: 'Shkruaj një email valid.' }
  }
  const localPart = email.split('@')[0] ?? ''
  const sanitizedLocalPart = localPart.replace(/[^a-z0-9._-]/gi, '.').replace(/[._-]{2,}/g, '.')
  let username = (usernameInput || sanitizedLocalPart).replace(/^[._-]+|[._-]+$/g, '')
  if (username.length < 3) username = `${username}usr`.slice(0, 32)
  if (username.length > 32) username = username.slice(0, 32)
  const password = input.password
  const role = input.role === 'OWNER' ? 'OWNER' : input.role === 'MANAGER' ? 'MANAGER' : 'WORKER'
  if (!password || password.length < 6) return { ok: false, message: 'Fjalëkalimi duhet të ketë të paktën 6 karaktere.' }
  if (username.length < 3 || username.length > 32) {
    return { ok: false, message: 'Username duhet të ketë 3-32 karaktere.' }
  }
  if (!/^[a-z0-9._-]+$/.test(username)) {
    return { ok: false, message: 'Username lejon vetëm a-z, 0-9, ., _, -.' }
  }
  if (!isSupabaseConfigured) return { ok: false, message: 'Supabase nuk është i konfiguruar.' }
  const companyId = await resolveCurrentCompanyId()
  if (!companyId) return { ok: false, message: 'User jo i kyçur.' }
  const existingInCompany = await supabase
    .from('profiles')
    .select('id')
    .eq('company_id', companyId)
    .eq('username', username)
    .maybeSingle()
  if (existingInCompany.error) {
    return { ok: false, message: existingInCompany.error.message }
  }
  if (existingInCompany.data?.id) {
    return {
      ok: false,
      message:
        'Ky username ekziston tashmë në këtë kompani. Përdor username tjetër ose përditëso user-in ekzistues.',
    }
  }
  const isRpcMissing = (err: unknown): boolean => {
    const code = typeof err === 'object' && err && 'code' in err ? String((err as any).code ?? '') : ''
    const msg = typeof err === 'object' && err && 'message' in err ? String((err as any).message ?? '') : ''
    const msgLower = msg.toLowerCase()
    const referencesTargetRpc =
      msgLower.includes('admin_create_user') ||
      msgLower.includes('public.admin_create_user') ||
      msgLower.includes('could not find the function')
    return (
      code === 'PGRST202' ||
      (code === '42883' && referencesTargetRpc) ||
      referencesTargetRpc
    )
  }
  const isAlreadyRegistered = (err: unknown): boolean => {
    const msg = typeof err === 'object' && err && 'message' in err ? String((err as any).message ?? '') : ''
    return /already registered|already been registered|user already registered|already exists|duplicate/i.test(
      msg.toLowerCase()
    )
  }
  let data: unknown = null
  let error: any = null

  // Use only the unique email RPC to avoid PostgREST confusion
  // from overloaded legacy admin_create_user signatures.
  const emailRpcResult = await supabase.rpc('admin_create_user_email', {
    p_email: email,
    p_password: password,
    p_role: role,
    p_username: username,
  })
  data = emailRpcResult.data
  error = emailRpcResult.error

  if (!error) {
    const userId = String(data ?? '').trim()
    if (!userId) return { ok: false, message: 'Krijimi i përdoruesit dështoi (nuk u kthye userId).' }
    const verify = await supabase
      .from('profiles')
      .select('id,company_id')
      .eq('id', userId)
      .maybeSingle()

    if (verify.error) return { ok: false, message: verify.error.message }
    const assignedCompanyId = String((verify.data as { company_id?: unknown } | null)?.company_id ?? '').trim()
    if (!assignedCompanyId || assignedCompanyId !== companyId) {
      return { ok: false, message: 'User u krijua por jo në kompaninë aktive. Kontrollo company_id te profile.' }
    }
    return { ok: true, userId }
  }

  if (error && isRpcMissing(error)) {
    const rawCode = String((error as { code?: unknown })?.code ?? '').trim()
    const rawMessage = String((error as { message?: unknown })?.message ?? '').trim()
    return {
      ok: false,
      message:
        `RPC admin_create_user_email nuk u gjet. Ekzekuto migrimin 20260329224500_admin_create_user_email_rpc.sql dhe pastaj: notify pgrst, 'reload schema'. (${rawCode || 'no-code'} ${rawMessage || ''})`,
    }
  }
  if (error) {
    if (isAlreadyRegistered(error)) {
      return {
        ok: false,
        message:
          'Ky username/email ekziston tashmë. Nëse ky user nuk kyçet, fshije dhe krijoje prapë pas migrimit të fundit SQL.',
      }
    }
    return { ok: false, message: error.message }
  }
  const userId = String(data ?? '').trim()
  if (!userId) return { ok: false, message: 'Krijimi i përdoruesit dështoi.' }
  const verify = await supabase
    .from('profiles')
    .select('id,company_id')
    .eq('id', userId)
    .maybeSingle()
  if (verify.error) return { ok: false, message: verify.error.message }
  const assignedCompanyId = String((verify.data as { company_id?: unknown } | null)?.company_id ?? '').trim()
  if (!assignedCompanyId || assignedCompanyId !== companyId) {
    return { ok: false, message: 'User u krijua por jo në kompaninë aktive. Kontrollo company_id te profile.' }
  }
  return { ok: true, userId }
}

export async function adminUpdateUserRole(
  userId: string,
  role: 'OWNER' | 'MANAGER' | 'WORKER'
): Promise<{ ok: true } | { ok: false; message: string }> {
  const id = userId.trim()
  if (!id) return { ok: false, message: 'ID e përdoruesit mungon.' }
  if (!isSupabaseConfigured) return { ok: true }
  const companyId = await resolveCurrentCompanyId()
  if (!companyId) return { ok: false, message: 'User jo i kyçur.' }
  const { data, error } = await supabase
    .from('profiles')
    .update({ role, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('company_id', companyId)
    .select('id')
  if (error) return { ok: false, message: error.message }
  if (!Array.isArray(data) || !data.length) {
    return { ok: false, message: 'Përdoruesi nuk u gjet në kompaninë aktive.' }
  }
  return { ok: true }
}

export async function adminUpdateUsername(
  userId: string,
  username: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const id = userId.trim()
  const nextUsername = username.trim().toLocaleLowerCase('sq-AL')
  if (!id) return { ok: false, message: 'ID e përdoruesit mungon.' }
  if (nextUsername.length < 3 || nextUsername.length > 32) {
    return { ok: false, message: 'Username duhet të ketë 3-32 karaktere.' }
  }
  if (!/^[a-z0-9._-]+$/.test(nextUsername)) {
    return { ok: false, message: 'Username lejon vetëm a-z, 0-9, ., _, -.' }
  }
  if (!isSupabaseConfigured) return { ok: true }
  const companyId = await resolveCurrentCompanyId()
  if (!companyId) return { ok: false, message: 'User jo i kyçur.' }
  const dupe = await supabase
    .from('profiles')
    .select('id')
    .eq('company_id', companyId)
    .eq('username', nextUsername)
    .neq('id', id)
    .maybeSingle()
  if (dupe.error) return { ok: false, message: dupe.error.message }
  if (dupe.data?.id) return { ok: false, message: 'Ky username përdoret nga një user tjetër.' }
  const { data, error } = await supabase
    .from('profiles')
    .update({ username: nextUsername, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('company_id', companyId)
    .select('id')
  if (error) return { ok: false, message: error.message }
  if (!Array.isArray(data) || !data.length) {
    return { ok: false, message: 'Përdoruesi nuk u gjet në kompaninë aktive.' }
  }
  return { ok: true }
}

export async function adminUpdateUserPassword(
  userId: string,
  password: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const id = userId.trim()
  const nextPassword = String(password ?? '')
  if (!id) return { ok: false, message: 'ID e përdoruesit mungon.' }
  if (nextPassword.length < 6) {
    return { ok: false, message: 'Fjalëkalimi duhet të ketë të paktën 6 karaktere.' }
  }
  if (!isSupabaseConfigured) return { ok: true }

  const { error } = await supabase.rpc('admin_update_user_password', {
    p_user_id: id,
    p_password: nextPassword,
  })
  if (!error) return { ok: true }

  const code = String(error.code ?? '').trim()
  const message = String(error.message ?? '').trim()
  const lower = message.toLowerCase()
  const rpcMissing =
    code === 'PGRST202' ||
    lower.includes('admin_update_user_password') ||
    lower.includes('could not find the function')

  if (rpcMissing) {
    return {
      ok: false,
      message:
        "RPC admin_update_user_password nuk u gjet. Ekzekuto migrimin 20260331193000_admin_update_user_password_rpc.sql dhe pastaj: notify pgrst, 'reload schema'.",
    }
  }
  if (lower.includes('invalid_password')) {
    return { ok: false, message: 'Fjalëkalimi duhet të ketë të paktën 6 karaktere.' }
  }
  if (lower.includes('forbidden_owner_only')) {
    return { ok: false, message: 'Vetëm OWNER mund të ndryshojë fjalëkalimin e përdoruesve.' }
  }
  if (lower.includes('forbidden_other_company')) {
    return { ok: false, message: 'Përdoruesi nuk i përket kompanisë aktive.' }
  }
  if (lower.includes('user_not_found') || lower.includes('auth_user_not_found')) {
    return { ok: false, message: 'Përdoruesi nuk u gjet.' }
  }

  return { ok: false, message: message || 'Ndryshimi i fjalëkalimit dështoi.' }
}

export async function adminSetUserActive(
  userId: string,
  isActive: boolean
): Promise<{ ok: true } | { ok: false; message: string }> {
  const id = userId.trim()
  if (!id) return { ok: false, message: 'ID e përdoruesit mungon.' }
  if (!isSupabaseConfigured) return { ok: true }
  const companyId = await resolveCurrentCompanyId()
  if (!companyId) return { ok: false, message: 'User jo i kyçur.' }
  const updatePayload: Record<string, unknown> = {
    is_active: isActive,
    updated_at: new Date().toISOString(),
  }
  if (!isActive) updatePayload.active_session_id = null
  const { data, error } = await supabase
    .from('profiles')
    .update(updatePayload)
    .eq('id', id)
    .eq('company_id', companyId)
    .select('id')
  if (error) return { ok: false, message: error.message }
  if (!Array.isArray(data) || !data.length) {
    return { ok: false, message: 'Përdoruesi nuk u gjet në kompaninë aktive.' }
  }
  return { ok: true }
}

export async function adminDeleteUser(userId: string): Promise<{ ok: true } | { ok: false; message: string }> {
  const id = userId.trim()
  if (!id) return { ok: false, message: 'ID e përdoruesit mungon.' }
  if (!isSupabaseConfigured) return { ok: true }
  const { error } = await supabase.rpc('admin_delete_user', { p_user_id: id })
  if (error) return { ok: false, message: error.message }
  return { ok: true }
}

export async function getDashboardInsights(days = 7): Promise<DashboardInsights> {
  const safeDays = Math.max(1, Math.min(30, Math.floor(days)))
  const weekdayLabels = ['Hën', 'Mar', 'Mër', 'Enj', 'Pre', 'Sht', 'Die']
  const buildRange = (anchorIso: string): string[] => {
    const anchor = new Date(`${anchorIso}T00:00:00`)
    if (Number.isNaN(anchor.getTime())) {
      const d = new Date()
      return Array.from({ length: safeDays }, (_, idx) => shiftIsoDays(d, -(safeDays - 1 - idx)))
    }
    return Array.from({ length: safeDays }, (_, idx) => shiftIsoDays(anchor, -(safeDays - 1 - idx)))
  }
  const today = new Date()
  const defaultRange = Array.from({ length: safeDays }, (_, idx) => shiftIsoDays(today, -(safeDays - 1 - idx)))
  const emptyTrend = defaultRange.map((date) => ({ date, count: 0 }))
  const emptyWeekdays = weekdayLabels.map((day) => ({ day, count: 0 }))

  if (!isSupabaseConfigured) {
    const shortages = fromMockShortages(getShortagesMock())
    const supplierMap = new Map<string, number>()
    const productMap = new Map<string, number>()
    const weekdayMap = new Map<string, number>(weekdayLabels.map((day) => [day, 0]))
    let urgent = 0
    let normal = 0
    for (const row of shortages) {
      const c = Math.max(1, Number(row.addedCount ?? 1))
      supplierMap.set(row.supplierName, (supplierMap.get(row.supplierName) ?? 0) + c)
      productMap.set(row.productName, (productMap.get(row.productName) ?? 0) + c)
      if (row.urgent) urgent += c
      else normal += c
      const dayIndex = new Date().getDay()
      const mondayIndex = (dayIndex + 6) % 7
      const dayLabel = weekdayLabels[mondayIndex]
      weekdayMap.set(dayLabel, (weekdayMap.get(dayLabel) ?? 0) + c)
    }
    if (emptyTrend.length) emptyTrend[emptyTrend.length - 1].count = shortages.length
    return {
      shortageTrend: emptyTrend,
      topSuppliers: [...supplierMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, count]) => ({ name, count })),
      topProducts: [...productMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, count]) => ({ name, count })),
      urgentBreakdown: { urgent, normal },
      weekdayTrend: weekdayLabels.map((day) => ({ day, count: weekdayMap.get(day) ?? 0 })),
    }
  }

  const [shortagesRes, products] = await Promise.all([
    supabase
      .from('mungesat')
      .select('entry_date,created_at,added_count,product_id,urgent')
      .order('created_at', { ascending: true }),
    getProducts(),
  ])
  if (shortagesRes.error || !shortagesRes.data) {
    return {
      shortageTrend: emptyTrend,
      topSuppliers: [],
      topProducts: [],
      urgentBreakdown: { urgent: 0, normal: 0 },
      weekdayTrend: emptyWeekdays,
    }
  }

  const productById = new Map(
    products.map((p) => [
      p.id,
      {
        name: String(p.name ?? '').trim() || 'Produkt',
        supplier: String(p.supplierName ?? '').trim() || 'Pa furnitor',
      },
    ])
  )
  const normalizedRows = (shortagesRes.data as any[])
    .map((row) => {
      const entryDay = String(row.entry_date ?? '').trim()
      const createdAt = String(row.created_at ?? '').trim()
      const createdDay = createdAt ? createdAt.slice(0, 10) : ''
      const day = entryDay || createdDay
      const count = Math.max(1, Number(row.added_count ?? 1))
      const productId = String(row.product_id ?? '').trim()
      const urgent = Boolean(row.urgent)
      return { day, count, productId, urgent }
    })
    .filter((row) => Boolean(row.day))

  if (!normalizedRows.length) {
    return {
      shortageTrend: emptyTrend,
      topSuppliers: [],
      topProducts: [],
      urgentBreakdown: { urgent: 0, normal: 0 },
      weekdayTrend: emptyWeekdays,
    }
  }

  const latestDay = normalizedRows
    .map((r) => r.day)
    .sort((a, b) => (a > b ? 1 : a < b ? -1 : 0))
    .slice(-1)[0]
  const dateRange = buildRange(latestDay)
  const sinceIso = dateRange[0]
  const byDay = new Map<string, number>(dateRange.map((date) => [date, 0]))
  const bySupplier = new Map<string, number>()
  const byProduct = new Map<string, number>()
  const weekdayMap = new Map<string, number>(weekdayLabels.map((day) => [day, 0]))
  let urgentCount = 0
  let normalCount = 0
  for (const row of normalizedRows) {
    const day = row.day
    if (!day || !byDay.has(day)) continue
    if (day < sinceIso) continue
    const count = row.count
    byDay.set(day, (byDay.get(day) ?? 0) + count)
    if (row.urgent) urgentCount += count
    else normalCount += count
    const dateObj = new Date(`${day}T00:00:00`)
    if (!Number.isNaN(dateObj.getTime())) {
      const mondayIndex = (dateObj.getDay() + 6) % 7
      const dayLabel = weekdayLabels[mondayIndex]
      weekdayMap.set(dayLabel, (weekdayMap.get(dayLabel) ?? 0) + count)
    }

    const p = productById.get(row.productId)
    const supplier = p?.supplier ?? 'Pa furnitor'
    const product = p?.name ?? 'Produkt'
    bySupplier.set(supplier, (bySupplier.get(supplier) ?? 0) + count)
    byProduct.set(product, (byProduct.get(product) ?? 0) + count)
  }
  return {
    shortageTrend: dateRange.map((date) => ({ date, count: byDay.get(date) ?? 0 })),
    topSuppliers: [...bySupplier.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, count]) => ({ name, count })),
    topProducts: [...byProduct.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, count]) => ({ name, count })),
    urgentBreakdown: { urgent: urgentCount, normal: normalCount },
    weekdayTrend: weekdayLabels.map((day) => ({ day, count: weekdayMap.get(day) ?? 0 })),
  }
}

export async function addProduct(input: {
  name: string
  supplier: string
  category: 'barna' | 'front'
  aliases: string[]
  producerName?: string
  lastPaidPrice?: number
  lastPriceDate?: string
  defaultOrderQty?: number
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
  const producerName = (input.producerName ?? '').trim()
  const defaultOrderQty = Math.max(1, Number(input.defaultOrderQty ?? 1))
  const lastPaidPrice =
    typeof input.lastPaidPrice === 'number' && Number.isFinite(input.lastPaidPrice)
      ? input.lastPaidPrice
      : null
  const lastPriceDate = (input.lastPriceDate ?? '').trim() || null
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

  const { data: sameSupplierProducts, error: listErr } = await supabase
    .from('products')
    .select('id,name')
    .eq('supplier_id', supplierId)
  if (listErr) return { ok: false, message: listErr.message }
  const nameNorm = name.trim().toLocaleLowerCase('sq-AL')
  const existingId =
    sameSupplierProducts?.find((r: { id: string; name: string }) => r.name.trim().toLocaleLowerCase('sq-AL') === nameNorm)
      ?.id ?? null

  const payload = {
    category: input.category,
    aliases: input.aliases,
    producer_name: producerName || null,
    last_paid_price: lastPaidPrice,
    last_price_date: lastPriceDate,
    default_order_qty: defaultOrderQty,
    updated_at: new Date().toISOString(),
  }

  if (existingId) {
    const { error } = await supabase.from('products').update(payload).eq('id', existingId)
    if (error) return { ok: false, message: error.message }
    return { ok: true }
  }

  const insertProduct = await supabase.from('products').insert({
    name,
    supplier_id: supplierId,
    ...payload,
  })
  if (insertProduct.error) return { ok: false, message: insertProduct.error.message }

  return { ok: true }
}

export async function updateProduct(input: {
  id: string
  name: string
  supplier: string
  category: 'barna' | 'front'
  aliases: string[]
  producerName?: string
  lastPaidPrice?: number
  lastPriceDate?: string
  defaultOrderQty?: number
}): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!isSupabaseConfigured) {
    const result = updateProductMock(input.id, {
      name: input.name,
      supplier: input.supplier,
      category: input.category,
      aliases: input.aliases,
    })
    return result.ok ? { ok: true } : result
  }

  const id = input.id.trim()
  const name = input.name.trim()
  const supplierName = input.supplier.trim()
  const producerName = (input.producerName ?? '').trim()
  const defaultOrderQty = Math.max(1, Number(input.defaultOrderQty ?? 1))
  const lastPaidPrice =
    typeof input.lastPaidPrice === 'number' && Number.isFinite(input.lastPaidPrice)
      ? input.lastPaidPrice
      : null
  const lastPriceDate = (input.lastPriceDate ?? '').trim() || null

  if (!id) return { ok: false, message: 'ID e produktit mungon.' }
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

  const { data: sameSupplierProducts, error: listErr } = await supabase
    .from('products')
    .select('id,name')
    .eq('supplier_id', supplierId)
  if (listErr) return { ok: false, message: listErr.message }
  const nameNorm = name.toLocaleLowerCase('sq-AL')
  const duplicateId =
    sameSupplierProducts?.find(
      (r: { id: string; name: string }) =>
        r.id !== id && r.name.trim().toLocaleLowerCase('sq-AL') === nameNorm
    )?.id ?? null
  if (duplicateId) {
    return { ok: false, message: 'Ekziston produkt me këtë emër për të njëjtin furnitor.' }
  }

  const { error } = await supabase
    .from('products')
    .update({
      name,
      supplier_id: supplierId,
      category: input.category,
      aliases: input.aliases,
      producer_name: producerName || null,
      last_paid_price: lastPaidPrice,
      last_price_date: lastPriceDate,
      default_order_qty: defaultOrderQty,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) return { ok: false, message: error.message }
  return { ok: true }
}

export async function deleteProduct(id: string): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!isSupabaseConfigured) {
    const result = deleteProductMock(id)
    return result.ok ? { ok: true } : result
  }
  const productId = id.trim()
  if (!productId) return { ok: false, message: 'ID e produktit mungon.' }

  const { data, error } = await supabase.from('products').delete().eq('id', productId).select('id').maybeSingle()
  if (error) {
    if ((error as { code?: string }).code === '23503') {
      return {
        ok: false,
        message: 'Produkti nuk mund të fshihet sepse përdoret në mungesa ose porosi.',
      }
    }
    return { ok: false, message: error.message }
  }
  if (!data?.id) {
    return { ok: false, message: 'Produkti nuk u gjet ose nuk u fshi.' }
  }
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

  const [productsRes, shortagesRes, lastQtyRpc] = await Promise.all([
    getProducts(),
    supabase
      .from('mungesat')
      .select('id,product_id,urgent,note,added_count,created_by,created_by_role')
      .eq('entry_date', todayIso())
      .order('created_at', { ascending: false }),
    supabase.rpc('last_final_qty_by_product'),
  ])

  if (shortagesRes.error || !shortagesRes.data) return []
  const productMap = new Map(productsRes.map((p) => [p.id, p]))
  const createdByIds = Array.from(
    new Set(
      shortagesRes.data
        .map((row: any) => String(row.created_by ?? '').trim())
        .filter((id: string) => Boolean(id))
    )
  )
  const profileLabelById = new Map<string, string>()
  if (createdByIds.length) {
    const profilesRes = await supabase.from('profiles').select('id,username,email').in('id', createdByIds)
    if (!profilesRes.error && Array.isArray(profilesRes.data)) {
      for (const row of profilesRes.data as Array<{ id: string; username?: string | null; email?: string | null }>) {
        const id = String(row.id ?? '').trim()
        if (!id) continue
        const label = String(row.username ?? '').trim() || String(row.email ?? '').trim() || 'Përdorues'
        profileLabelById.set(id, label)
      }
    }
  }
  const lastFinalQtyByProduct = new Map<string, number>()
  if (!lastQtyRpc.error && Array.isArray(lastQtyRpc.data)) {
    for (const row of lastQtyRpc.data as Array<{ product_id: string; final_qty: number | null }>) {
      if (!row?.product_id) continue
      const qty = Number(row.final_qty ?? 0)
      if (Number.isFinite(qty) && qty > 0) lastFinalQtyByProduct.set(row.product_id, qty)
    }
  }

  return shortagesRes.data.map((row: any) => {
    const product = productMap.get(row.product_id)
    const addedCount = Math.max(1, Number(row.added_count ?? 1))
    const lastFinalQty = lastFinalQtyByProduct.get(row.product_id)
    const defaultQty = Math.max(1, Number(product?.defaultOrderQty ?? 1))
    const baseQty = lastFinalQty && lastFinalQty > 0 ? lastFinalQty : defaultQty
    const urgentBump = row.urgent ? 1 : 0
    const repeatBump = addedCount >= 3 ? 1 : 0
    const suggestedQty = Math.max(1, baseQty + urgentBump + repeatBump)
    return {
      id: row.id,
      productId: row.product_id,
      productName: product?.name ?? 'Produkt',
      supplierId: product?.supplierId,
      supplierName: product?.supplierName ?? 'Pa furnitor',
      urgent: Boolean(row.urgent),
      note: row.note ?? '',
      addedCount,
      suggestedQty,
      createdById: String(row.created_by ?? '').trim() || undefined,
      createdByRole: String(row.created_by_role ?? '').trim().toUpperCase() as
        | 'OWNER'
        | 'MANAGER'
        | 'WORKER'
        | undefined,
      createdByLabel: profileLabelById.get(String(row.created_by ?? '').trim()) ?? undefined,
    }
  })
}

export async function updateSuggestedQty(id: string, delta: number): Promise<ShortageView[]> {
  if (!isSupabaseConfigured) {
    const rows = updateSuggestedQtyMock(id, delta)
    return fromMockShortages(rows)
  }

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

export async function reassignShortageProduct(shortageId: string, productId: string): Promise<ShortageView[]> {
  if (!isSupabaseConfigured) return getTodayShortages()
  const targetShortageId = shortageId.trim()
  const targetProductId = productId.trim()
  if (!targetShortageId || !targetProductId) return getTodayShortages()
  const { error } = await supabase
    .from('mungesat')
    .update({ product_id: targetProductId, updated_at: new Date().toISOString() })
    .eq('id', targetShortageId)
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

  for (const [, items] of grouped.entries()) {
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

    const existingDraftsRes = await supabase
      .from('orders')
      .select('id')
      .eq('supplier_id', supplierId)
      .eq('created_by', userId)
      .eq('status', 'DRAFT')
      .order('created_at', { ascending: false })

    let orderId: string | null = null
    const existingDraftIds = Array.isArray(existingDraftsRes.data)
      ? existingDraftsRes.data.map((r: any) => String(r.id)).filter(Boolean)
      : []

    if (existingDraftIds.length > 0) {
      orderId = existingDraftIds[0]
      const staleDraftIds = existingDraftIds.slice(1)
      if (staleDraftIds.length > 0) {
        await supabase.from('orders').delete().in('id', staleDraftIds)
      }
      await supabase.from('order_items').delete().eq('order_id', orderId)
    } else {
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
      orderId = String(orderInsert.data.id)
    }
    if (!orderId) continue

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
    const receipt = `POROSI MUNGESASH
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

export async function getRecentOrders(limit = 100): Promise<OwnerOrder[]> {
  if (!isSupabaseConfigured) return []

  const since = new Date()
  since.setDate(since.getDate() - 30)

  const { data, error } = await supabase
    .from('orders')
    .select('id,status,created_at,suppliers(name),order_items(final_qty,suggested_qty,products(name))')
    .gte('created_at', since.toISOString())
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
    const rawStatus = String(row.status ?? '').toUpperCase()
    return {
      id: stableOrderUiId(dbId, 1000 + idx),
      dbId,
      supplier: row.suppliers?.name ?? 'Pa furnitor',
      items,
      status: rawStatus === 'SENT' ? 'SENT' : 'DRAFT',
    } satisfies OwnerOrder
  })
}

export async function markOrderAsSent(order: OwnerOrder): Promise<OwnerOrder> {
  if (!isSupabaseConfigured) {
    return { ...order, status: 'SENT' }
  }
  if (!order.dbId) {
    throw new Error('Porosia nuk ka ID nga baza — nuk mund të ruhet statusi.')
  }

  const { error: rpcError } = await supabase.rpc('mark_order_sent', {
    p_order_id: order.dbId,
  })
  if (!rpcError) {
    return { ...order, status: 'SENT' }
  }

  const code = (rpcError as { code?: string }).code
  const msg = rpcError.message ?? ''
  const rpcMissing =
    code === 'PGRST202' ||
    code === '42883' ||
    /mark_order_sent|function .* does not exist|Could not find the function/i.test(msg)

  if (!rpcMissing) {
    throw new Error(msg || 'Shënimi si dërguar dështoi.')
  }

  const { data, error } = await supabase
    .from('orders')
    .update({ status: 'SENT', sent_at: new Date().toISOString() })
    .eq('id', order.dbId)
    .select('id')
    .maybeSingle()
  if (error) throw error
  if (!data?.id) {
    throw new Error(
      'Asnjë rresht nuk u përditësua. Ekzekuto migrimin mark_order_sent në Supabase dhe kontrollo që profili yt është OWNER.'
    )
  }
  return { ...order, status: 'SENT' }
}
