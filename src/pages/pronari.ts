import { getProfile, signOut } from '../lib/auth.js'
import { isSupabaseConfigured, supabase } from '../lib/supabase.js'
import { getMockUser } from '../types.js'
import { jsPDF } from 'jspdf'
import { rankProductsForWorkerSearch } from '../lib/fuzzyProductSearch.js'
import {
  addMungese,
  adminCreateUser,
  adminDeleteUser,
  adminSetUserActive,
  adminUpdateUsername,
  adminUpdateUserRole,
  addProduct,
  addSupplier,
  deleteSupplier,
  deleteProduct,
  deleteShortage,
  generateOrdersFromShortages,
  getPreferredProductByName,
  getCompanyDetails,
  getDashboardInsights,
 getRecentOrders,
  getProducts,
  getSuppliers,
  getTodayShortages,
  markOrderAsSent,
  reassignShortageProduct,
  renameSupplier,
  setPreferredProductByName,
  updateProduct,
  updateShortageMeta,
  updateCompanyDetails,
  type CompanyDetails,
  type DashboardInsights,
  type ProductView,
  type SupplierView,
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
const COMPANY_DETAILS_CACHE_KEY = 'flowinventory-company-details-cache-v1'
const PENDING_SETTINGS_USERS_KEY = 'flowinventory-settings-pending-users-v1'
type OwnerSection =
  | 'dashboard'
  | 'mungesat'
  | 'porosite'
  | 'import'
  | 'settings'
  | 'profile'
  | 'kompania'
  | 'ekipa'

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

function emptyCompanyDetails(): CompanyDetails {
  return {
    name: '',
    posName: '',
    address: '',
    phone: '',
    email: '',
    logoUrl: '',
    otherInfo: '',
  }
}

function readCompanyDetailsCache(): CompanyDetails | null {
  try {
    const raw = localStorage.getItem(COMPANY_DETAILS_CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<CompanyDetails>
    return {
      name: String(parsed.name ?? '').trim(),
      posName: String(parsed.posName ?? '').trim(),
      address: String(parsed.address ?? '').trim(),
      phone: String(parsed.phone ?? '').trim(),
      email: String(parsed.email ?? '').trim(),
      logoUrl: String(parsed.logoUrl ?? '').trim(),
      otherInfo: String(parsed.otherInfo ?? '').trim(),
    }
  } catch {
    return null
  }
}

function writeCompanyDetailsCache(value: CompanyDetails): void {
  try {
    localStorage.setItem(COMPANY_DETAILS_CACHE_KEY, JSON.stringify(value))
  } catch {
  }
}

function mergeCompanyDetails(serverValue: CompanyDetails, cachedValue: CompanyDetails | null): CompanyDetails {
  const cache = cachedValue ?? emptyCompanyDetails()
  return {
    name: serverValue.name || cache.name,
    posName: serverValue.posName || cache.posName,
    address: serverValue.address || cache.address,
    phone: serverValue.phone || cache.phone,
    email: serverValue.email || cache.email,
    logoUrl: serverValue.logoUrl || cache.logoUrl,
    otherInfo: serverValue.otherInfo || cache.otherInfo,
  }
}

function compareAlbanian(a: string, b: string): number {
  return a.localeCompare(b, 'sq-AL', { sensitivity: 'base', numeric: true })
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value.trim()
  )
}

function buildEmptyDashboardInsights(days: 7 | 14 | 30): DashboardInsights {
  const d = new Date()
  const trend: Array<{ date: string; count: number }> = []
  const weekdayTrend = ['Hën', 'Mar', 'Mër', 'Enj', 'Pre', 'Sht', 'Die'].map((day) => ({
    day,
    count: 0,
  }))
  for (let i = days - 1; i >= 0; i--) {
    const t = new Date(d)
    t.setDate(d.getDate() - i)
    const y = t.getFullYear()
    const m = String(t.getMonth() + 1).padStart(2, '0')
    const day = String(t.getDate()).padStart(2, '0')
    trend.push({ date: `${y}-${m}-${day}`, count: 0 })
  }
  return {
    shortageTrend: trend,
    topSuppliers: [],
    topProducts: [],
    urgentBreakdown: { urgent: 0, normal: 0 },
    weekdayTrend,
  }
}

export function renderPronari(
  container: HTMLElement,
  routeSection = 'dashboard',
  currentRole: 'OWNER' | 'MANAGER' | 'WORKER' = 'OWNER'
): void {
  const canSeeSettings = currentRole === 'OWNER'
  const section: OwnerSection =
    routeSection === 'dashboard' ||
    routeSection === 'mungesat' ||
    routeSection === 'porosite' ||
    routeSection === 'import' ||
    routeSection === 'settings' ||
    routeSection === 'profile' ||
    routeSection === 'kompania' ||
    routeSection === 'ekipa'
      ? routeSection
      : 'dashboard'
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
  type TeamUser = {
    id: string
    email: string
    username: string
    role: string
    isActive: boolean
    createdAt: string
    lastSignInAt: string
    shortagesToday: number
    ordersSentToday: number
    shortagesTotal: number
    lastShortageAt: string
  }

  const readPendingSettingsUsers = (): TeamUser[] => {
    if (!activeCompanyId) return []
    try {
      const scopedKey = `${PENDING_SETTINGS_USERS_KEY}:${activeCompanyId || 'global'}`
      const raw = localStorage.getItem(scopedKey)
      if (!raw) return []
      const parsed = JSON.parse(raw) as unknown
      if (!Array.isArray(parsed)) return []
      return parsed
        .map((row: any) => ({
          id: String(row?.id ?? '').trim(),
          email: String(row?.email ?? '').trim() || '—',
          username: String(row?.username ?? '').trim() || 'Përdorues',
          role: String(row?.role ?? 'WORKER'),
          isActive: row?.isActive === false ? false : true,
          createdAt: String(row?.createdAt ?? ''),
          lastSignInAt: String(row?.lastSignInAt ?? ''),
          shortagesToday: Math.max(0, Number(row?.shortagesToday ?? 0)),
          ordersSentToday: Math.max(0, Number(row?.ordersSentToday ?? 0)),
          shortagesTotal: Math.max(0, Number(row?.shortagesTotal ?? 0)),
          lastShortageAt: String(row?.lastShortageAt ?? ''),
        }))
        .filter((u: TeamUser) => Boolean(u.id))
    } catch {
      return []
    }
  }

  const writePendingSettingsUsers = (rows: TeamUser[]): void => {
    if (!activeCompanyId) return
    try {
      const scopedKey = `${PENDING_SETTINGS_USERS_KEY}:${activeCompanyId || 'global'}`
      localStorage.setItem(scopedKey, JSON.stringify(rows.slice(0, 100)))
    } catch {
    }
  }

  const mergeTeamUsers = (primary: TeamUser[], secondary: TeamUser[]): TeamUser[] => {
    const merged = new Map<string, TeamUser>()
    ;[...primary, ...secondary].forEach((u) => {
      const id = String(u.id ?? '').trim()
      if (!id) return
      if (!merged.has(id)) merged.set(id, u)
    })
    return [...merged.values()]
  }

  const resolveRealUserId = async (username: string): Promise<string | null> => {
    if (!isSupabaseConfigured || !activeCompanyId) return null
    const normalized = username.trim().toLocaleLowerCase('sq-AL')
    if (!normalized) return null
    const res = await supabase
      .from('profiles')
      .select('id')
      .eq('company_id', activeCompanyId)
      .eq('username', normalized)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (res.error || !res.data?.id) return null
    const id = String(res.data.id ?? '').trim()
    return isUuid(id) ? id : null
  }

  let shortages: ShortageView[] = []
  let products: ProductView[] = []
  let suppliers: SupplierView[] = []
  let preferredProductByName: Record<string, string> = {}
  let teamUsers: TeamUser[] = []
  let teamLoadError = ''
  let teamLoading = false
  let searchQuery = ''
  let sortBy: 'supplier' | 'name' = readStoredShortageSort()
  let generatedOrders: OwnerOrder[] = []
  let allOrders: OwnerOrder[] = []
  let showAllOrders = false
  let pendingImportRows: ImportRow[] = []
  let pendingImportIssues: string[] = []
  let importTab: 'manual' | 'file' = 'file'
  let companyDetails: CompanyDetails = readCompanyDetailsCache() ?? emptyCompanyDetails()
  let dashboardInsights: DashboardInsights = buildEmptyDashboardInsights(7)
  let dashboardRangeDays: 7 | 14 | 30 = 7
  let productQuery = ''
  let supplierQuery = ''
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
    username: string
    email: string
    role: string
    userId: string
    provider: string
    sessionMode: string
  } = {
    firstName: '',
    lastName: '',
    username: '',
    email: '—',
    role: '',
    userId: '—',
    provider: 'email',
    sessionMode: isSupabaseConfigured ? 'Supabase' : 'Demo',
  }
  let activeCompanyId = ''

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

  async function reloadDashboardInsights(): Promise<void> {
    try {
      dashboardInsights = await getDashboardInsights(dashboardRangeDays)
    } catch {
      dashboardInsights = buildEmptyDashboardInsights(dashboardRangeDays)
    }
    refreshUI()
  }

  async function loadTeamUsers(): Promise<TeamUser[]> {
    const buildCurrentUserFallback = async (): Promise<TeamUser[]> => {
      if (!isSupabaseConfigured) {
        const mock = getMockUser()
        return [
          {
            id: 'demo-owner',
            email: mock?.email ?? 'demo@flowinventory.local',
            username: `${mock?.firstName ?? 'Demo'} ${mock?.lastName ?? 'Owner'}`.trim(),
            role: String(mock?.role ?? 'OWNER'),
            isActive: true,
            createdAt: '',
            lastSignInAt: '',
            shortagesToday: 0,
            ordersSentToday: 0,
            shortagesTotal: 0,
            lastShortageAt: '',
          },
        ]
      }
      const [{ data: userData }, profile] = await Promise.all([supabase.auth.getUser(), getProfile()])
      const user = userData.user
      if (!user) return []
      const username =
        String(user.user_metadata?.username ?? '').trim() ||
        String(user.email ?? '').split('@')[0]?.trim() ||
        'admin'
      return [
        {
          id: String(user.id ?? ''),
          email: String(user.email ?? '').trim() || '—',
          username,
          role: String(profile?.role ?? 'OWNER'),
          isActive: true,
          createdAt: '',
          lastSignInAt: String(user.last_sign_in_at ?? ''),
          shortagesToday: 0,
          ordersSentToday: 0,
          shortagesTotal: 0,
          lastShortageAt: '',
        },
      ]
    }

    if (!canSeeSettings) return []
    if (!isSupabaseConfigured) {
      return buildCurrentUserFallback()
    }
    let companyId = activeCompanyId
    const mapProfileRows = (rows: any[]): TeamUser[] =>
      rows.map((row: any) => ({
        id: String(row.id ?? ''),
        email: String(row.email ?? '').trim() || '—',
        username: String(row.username ?? '').trim() || 'Përdorues',
        role: String(row.role ?? 'WORKER'),
        isActive: row.is_active === false ? false : true,
        createdAt: String(row.created_at ?? ''),
        lastSignInAt: '',
        shortagesToday: 0,
        ordersSentToday: 0,
        shortagesTotal: 0,
        lastShortageAt: '',
      }))
    if (!companyId) {
      try {
        const rpcCompany = await supabase.rpc('current_company_id')
        if (!rpcCompany.error) {
          const rpcId = String(rpcCompany.data ?? '').trim()
          if (rpcId) {
            companyId = rpcId
            activeCompanyId = rpcId
          }
        }
      } catch {
      }
    }
    if (!companyId) {
      try {
        const { data: authData } = await supabase.auth.getUser()
        const uid = String(authData.user?.id ?? '').trim()
        if (uid) {
          const companyRes = await supabase
            .from('profiles')
            .select('company_id')
            .eq('id', uid)
            .maybeSingle()
          if (!companyRes.error && companyRes.data) {
            companyId = String((companyRes.data as { company_id?: unknown }).company_id ?? '').trim()
            if (companyId) activeCompanyId = companyId
          }
        }
      } catch {
      }
    }
    if (!companyId) return buildCurrentUserFallback()

    const mapRpcRows = (rows: any[]): TeamUser[] =>
      rows.map((row: any) => ({
        id: String(row.id ?? ''),
        email: String(row.email ?? '').trim() || '—',
        username: String(row.username ?? '').trim() || 'Përdorues',
        role: String(row.role ?? 'WORKER'),
        isActive: row.is_active === false ? false : true,
        createdAt: String(row.created_at ?? ''),
        lastSignInAt: String(row.last_sign_in_at ?? ''),
        shortagesToday: Math.max(0, Number(row.shortages_created_today ?? 0)),
        ordersSentToday: Math.max(0, Number(row.orders_marked_sent_today ?? 0)),
        shortagesTotal: Math.max(
          0,
          Number(row.shortages_since_created ?? row.shortages_total ?? row.shortages_count ?? 0)
        ),
        lastShortageAt: String(row.last_shortage_at ?? ''),
      }))
    let rpcMapped: TeamUser[] = []
    const rpcRes = await supabase.rpc('admin_list_users')
    if (!rpcRes.error && Array.isArray(rpcRes.data) && rpcRes.data.length > 0) {
      const rpcRowsRaw = rpcRes.data as any[]
      const scopedRpcRows =
        rpcRowsRaw.length > 0 && 'company_id' in (rpcRowsRaw[0] ?? {}) && companyId
          ? rpcRowsRaw.filter((r) => String((r as any)?.company_id ?? '').trim() === companyId)
          : rpcRowsRaw
      rpcMapped = mapRpcRows(scopedRpcRows)
    }

    let fallbackQuery = supabase
      .from('profiles')
      .select('id,email,username,role,is_active,created_at')
      .order('created_at', { ascending: false })
    fallbackQuery = fallbackQuery.eq('company_id', companyId)
    const fallbackRes = await fallbackQuery
    if (fallbackRes.error) throw new Error(fallbackRes.error.message)
    const rows = Array.isArray(fallbackRes.data) ? fallbackRes.data : []
    const mapped = mapProfileRows(rows)
    let mappedWithMetrics = mapped
    if (mapped.length > 0) {
      const userIds = mapped
        .map((u) => String(u.id ?? '').trim())
        .filter((id) => Boolean(id) && isUuid(id))
      if (userIds.length > 0) {
        const shortageRes = await supabase
          .from('mungesat')
          .select('created_by,added_count,created_at,entry_date')
          .eq('company_id', companyId)
          .in('created_by', userIds)
        if (!shortageRes.error && Array.isArray(shortageRes.data)) {
          const metricByUser = new Map<string, { total: number; last: string }>()
          for (const row of shortageRes.data as Array<{
            created_by?: unknown
            added_count?: unknown
            created_at?: unknown
            entry_date?: unknown
          }>) {
            const createdBy = String(row.created_by ?? '').trim()
            if (!createdBy) continue
            const count = Math.max(1, Number(row.added_count ?? 1))
            const createdAt = String(row.created_at ?? '').trim()
            const entryDate = String(row.entry_date ?? '').trim()
            const candidateDate = createdAt || (entryDate ? `${entryDate}T00:00:00.000Z` : '')
            const prev = metricByUser.get(createdBy) ?? { total: 0, last: '' }
            let nextLast = prev.last
            if (candidateDate) {
              if (!nextLast || new Date(candidateDate).getTime() > new Date(nextLast).getTime()) {
                nextLast = candidateDate
              }
            }
            metricByUser.set(createdBy, {
              total: prev.total + count,
              last: nextLast,
            })
          }
          mappedWithMetrics = mapped.map((u) => ({
            ...u,
            shortagesTotal: metricByUser.get(u.id)?.total ?? 0,
            lastShortageAt: metricByUser.get(u.id)?.last ?? '',
          }))
        }
      }
    }
    const backendRows = mergeTeamUsers(rpcMapped, mappedWithMetrics)
    if (backendRows.length > 0) {
      const pending = readPendingSettingsUsers()
      const combined = mergeTeamUsers(backendRows, pending)
      writePendingSettingsUsers(pending.filter((p) => !backendRows.some((u) => u.id === p.id)))
      return combined
    }
    const pending = readPendingSettingsUsers()
    if (pending.length > 0) return pending
    return buildCurrentUserFallback()
  }

  async function loadAccountInfo(): Promise<void> {
    if (!isSupabaseConfigured) {
      activeCompanyId = 'demo'
      const mock = getMockUser()
      accountInfo = {
        firstName: mock?.firstName ?? 'Demo',
        lastName: mock?.lastName ?? 'Owner',
        username: String(mock?.email ?? '').split('@')[0] || 'demo',
        email: mock?.email ?? 'demo@flowinventory.local',
        role: mock?.role ?? 'OWNER',
        userId: 'demo-user',
        provider: 'demo',
        sessionMode: 'Demo',
      }
      return
    }
    try {
      const { data: userData } = await supabase.auth.getUser()
      const user = userData.user
      if (!user) {
        activeCompanyId = ''
        accountInfo = {
          firstName: 'Perdorues',
          lastName: '',
          username: '',
          email: '—',
          role: 'OWNER',
          userId: '—',
          provider: 'email',
          sessionMode: 'Supabase',
        }
        return
      }
      let role = 'OWNER'
      try {
        const profile = await getProfile()
        if (profile?.role) role = String(profile.role)
      } catch {
      }
      const metadataRole = String(user.user_metadata?.role ?? '').trim().toUpperCase()
      if (!role && (metadataRole === 'OWNER' || metadataRole === 'MANAGER' || metadataRole === 'WORKER')) {
        role = metadataRole
      }
      const provider = user.app_metadata?.provider ?? user.identities?.[0]?.provider ?? 'email'
      const usernameMeta = String(user.user_metadata?.username ?? '').trim()
      const fallbackName = usernameMeta || String(user.email ?? '').split('@')[0]?.trim() || 'Perdorues'
      accountInfo = {
        firstName: String(user.user_metadata?.first_name ?? fallbackName),
        lastName: String(user.user_metadata?.last_name ?? ''),
        username: usernameMeta || String(user.email ?? '').split('@')[0]?.trim() || '',
        email: String(user.email ?? '').trim() || '—',
        role: role || 'OWNER',
        userId: String(user.id ?? '').trim() || '—',
        provider: String(provider),
        sessionMode: 'Supabase',
      }
      try {
        const companyRes = await supabase
          .from('profiles')
          .select('company_id')
          .eq('id', user.id)
          .maybeSingle()
        if (!companyRes.error && companyRes.data) {
          activeCompanyId = String((companyRes.data as { company_id?: unknown }).company_id ?? '').trim()
        }
      } catch {
      }
    } catch {
      activeCompanyId = ''
      accountInfo = {
        firstName: 'Perdorues',
        lastName: '',
        username: '',
        email: '—',
        role: 'OWNER',
        userId: '—',
        provider: 'email',
        sessionMode: 'Supabase',
      }
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

  function normalizeProductNameKey(value: string): string {
    return value.trim().toLocaleLowerCase('sq-AL')
  }

  function renderSuppliersList(): string {
    const q = supplierQuery.trim().toLocaleLowerCase('sq-AL')
    const rows = suppliers
      .filter((s) => !q || s.name.toLocaleLowerCase('sq-AL').includes(q))
      .sort((a, b) => compareAlbanian(a.name, b.name))

    if (!rows.length) {
      return '<li class="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">Nuk ka furnitorë.</li>'
    }

    return rows
      .map(
        (s) => `
          <li class="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
            <div class="min-w-0">
              <p class="truncate text-xs font-medium text-slate-800">${s.name}</p>
              <p class="text-[11px] text-slate-500">${s.productCount} produkte</p>
            </div>
            <div class="inline-flex items-center gap-1">
              <button data-action="rename-supplier" data-supplier-id="${s.id}" class="premium-btn-ghost rounded-md px-2 py-1 text-[11px]">Rename</button>
              <button data-action="delete-supplier" data-supplier-id="${s.id}" class="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-[11px] text-red-700 hover:bg-red-100">Delete</button>
            </div>
          </li>`
      )
      .join('')
  }

  function renderOwnerShortageSuggestions(query: string): string {
    const q = query.trim()
    if (!q) return ''
    const results = rankProductsForWorkerSearch(products, q, 8)
    if (!results.length) {
      return `<div class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500">Nuk u gjet produkt i përshtatshëm.</div>`
    }
    return `
      <ul class="overflow-hidden rounded-lg border border-slate-200 divide-y divide-slate-200 bg-white">
        ${results
          .map(
            (p) => `
              <li>
                <button type="button" data-action="select-owner-shortage-product" data-product-id="${p.id}" class="w-full text-left px-3 py-2 hover:bg-slate-50 transition-colors">
                  <span class="block text-xs font-medium text-slate-800">${p.name}</span>
                  <span class="block text-[11px] text-slate-500">Furnitori: ${p.supplierName}</span>
                </button>
              </li>`
          )
          .join('')}
      </ul>
    `
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

  function openSupplierReassignModal(initial: ShortageView): Promise<string | null> {
    return new Promise((resolve) => {
      const sameNameProducts = products
        .filter((p) => p.name.trim().toLocaleLowerCase('sq-AL') === initial.productName.trim().toLocaleLowerCase('sq-AL'))
        .sort((a, b) => compareAlbanian(a.supplierName, b.supplierName))
      const options = sameNameProducts
        .map(
          (p) =>
            `<option value="${p.id}" ${p.id === initial.productId ? 'selected' : ''}>${p.supplierName} (${p.category})</option>`
        )
        .join('')

      const overlay = document.createElement('div')
      overlay.className = 'fixed inset-0 z-[70] bg-slate-900/18 flex items-center justify-center p-4'
      overlay.innerHTML = `
        <div class="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
          <h3 class="text-lg font-semibold text-slate-900 mb-1">Ndrysho furnitorin</h3>
          <p class="text-sm text-slate-500 mb-4">Zgjidh furnitorin për <strong>${initial.productName}</strong>.</p>
          <label class="text-sm text-slate-700 block">
            Furnitori
            <select id="owner-reassign-supplier-product" class="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500">
              ${options || `<option value="${initial.productId}">${initial.supplierName}</option>`}
            </select>
          </label>
          <div class="mt-4 flex items-center justify-end gap-2">
            <button type="button" id="owner-reassign-cancel" class="premium-btn-ghost rounded-xl px-4 py-2 text-sm font-medium">Anulo</button>
            <button type="button" id="owner-reassign-save" class="premium-btn-primary rounded-xl px-4 py-2 text-sm font-semibold">Ruaj</button>
          </div>
        </div>
      `
      document.body.appendChild(overlay)

      const close = (value: string | null) => {
        overlay.remove()
        resolve(value)
      }
      overlay
        .querySelector<HTMLButtonElement>('#owner-reassign-cancel')
        ?.addEventListener('click', () => close(null))
      overlay.querySelector<HTMLButtonElement>('#owner-reassign-save')?.addEventListener('click', () => {
        const selectedId =
          overlay.querySelector<HTMLSelectElement>('#owner-reassign-supplier-product')?.value?.trim() ?? ''
        close(selectedId || null)
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
              <input id="owner-edit-product-supplier" type="text" list="owner-supplier-options" class="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500" />
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

  function parseOrderItemForPdf(raw: string): { product: string; qty: number; urgent: boolean } {
    const clean = String(raw ?? '').trim()
    const match = clean.match(/^(\d+)\s*[x×]\s*(.+)$/i)
    const qty = Math.max(1, Number(match?.[1] ?? 1))
    const tail = String(match?.[2] ?? clean).trim()
    const urgent = /URGJENT/i.test(tail)
    const product = tail.replace(/\s*\(URGJENT\)\s*/gi, ' ').replace(/\s*URGJENT\s*/gi, ' ').trim() || tail
    return { product, qty, urgent }
  }

  async function downloadOrderPdf(order: OwnerOrder): Promise<void> {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' })
    const pageWidth = doc.internal.pageSize.getWidth()
    const cardWidth = 112
    const cardX = (pageWidth - cardWidth) / 2
    const cardY = 16
    const generatedAt = new Date().toLocaleString('sq-AL')
    const parsedItems = order.items.map(parseOrderItemForPdf)
    const totalQty = parsedItems.reduce((sum, row) => sum + row.qty, 0)

    const companyName = companyDetails.name.trim() || companyDetails.posName.trim() || 'FlowInventory'
    const companyLine = [companyDetails.address.trim(), companyDetails.phone.trim()].filter(Boolean).join(' | ')
    const companyEmail = companyDetails.email.trim()

    doc.setDrawColor(219, 234, 254)
    doc.setFillColor(255, 255, 255)
    doc.roundedRect(cardX, cardY, cardWidth, 180, 1.5, 1.5, 'FD')

    doc.setFillColor(59, 130, 246)
    doc.roundedRect(cardX + 1.5, cardY + 1.5, cardWidth - 3, 1.6, 0.6, 0.6, 'F')

    doc.setDrawColor(191, 219, 254)
    doc.setFillColor(248, 250, 252)
    doc.roundedRect(cardX + 2, cardY + 5, cardWidth - 4, 14, 1, 1, 'FD')
    doc.setTextColor(30, 64, 175)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.text('FlowInventory', cardX + 4, cardY + 10)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.8)
    doc.setTextColor(71, 85, 105)
    doc.text('Porosi per furnitor', cardX + 4, cardY + 13.4)

    const boxGap = 2
    const boxY = cardY + 22
    const boxW = (cardWidth - 6 - boxGap) / 2
    const leftX = cardX + 2
    const rightX = leftX + boxW + boxGap
    doc.setDrawColor(219, 234, 254)
    doc.setFillColor(248, 250, 252)
    doc.roundedRect(leftX, boxY, boxW, 22, 1, 1, 'FD')
    doc.roundedRect(rightX, boxY, boxW, 22, 1, 1, 'FD')

    doc.setTextColor(30, 64, 175)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(6.6)
    doc.text('Informacion i biznesit', leftX + 2, boxY + 4.2)
    doc.text('Detajet e porosise', rightX + 2, boxY + 4.2)

    doc.setTextColor(15, 23, 42)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.3)
    doc.text(companyName, leftX + 2, boxY + 8.6)
    if (companyLine) doc.text(doc.splitTextToSize(companyLine, boxW - 4), leftX + 2, boxY + 12.2)
    if (companyEmail) doc.text(doc.splitTextToSize(companyEmail, boxW - 4), leftX + 2, boxY + 16.2)
    doc.text(`Krijuar: ${generatedAt}`, leftX + 2, boxY + 20)

    doc.setFont('helvetica', 'bold')
    doc.text('ID e porosise:', rightX + 2, boxY + 8.6)
    doc.text('Artikuj te porositur:', rightX + 2, boxY + 12.6)
    doc.text('Sasi totale:', rightX + 2, boxY + 16.6)
    doc.setFont('helvetica', 'normal')
    doc.text(String(order.id), rightX + boxW - 2, boxY + 8.6, { align: 'right' })
    doc.text(String(parsedItems.length), rightX + boxW - 2, boxY + 12.6, { align: 'right' })
    doc.text(String(totalQty), rightX + boxW - 2, boxY + 16.6, { align: 'right' })

    const titleY = boxY + 25.5
    doc.setFillColor(239, 246, 255)
    doc.roundedRect(cardX + 2, titleY, cardWidth - 4, 5.6, 1, 1, 'F')
    doc.setTextColor(30, 64, 175)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(6.8)
    doc.text('Artikujt e porosise', cardX + 4, titleY + 3.8)

    const tableY = titleY + 7
    const colNo = cardX + 3.5
    const colProduct = cardX + 8
    const colQty = cardX + cardWidth - 21
    const colStatus = cardX + cardWidth - 3.5
    doc.setFillColor(59, 130, 246)
    doc.roundedRect(cardX + 2, tableY, cardWidth - 4, 5.5, 0.8, 0.8, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(6.2)
    doc.text('#', colNo, tableY + 3.7)
    doc.text('Produkt', colProduct, tableY + 3.7)
    doc.text('Sasia', colQty, tableY + 3.7)
    doc.text('Status', colStatus, tableY + 3.7, { align: 'right' })

    let rowY = tableY + 7
    parsedItems.forEach((item, index) => {
      if (index % 2 === 0) {
        doc.setFillColor(248, 250, 252)
        doc.rect(cardX + 2, rowY - 3.8, cardWidth - 4, 5.6, 'F')
      }
      doc.setTextColor(15, 23, 42)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(6.2)
      doc.text(String(index + 1), colNo, rowY)
      const productText = doc.splitTextToSize(item.product, colQty - colProduct - 2)
      doc.text(productText[0] ?? item.product, colProduct, rowY)
      doc.text(String(item.qty), colQty, rowY)
      if (item.urgent) {
        doc.setTextColor(185, 28, 28)
        doc.setFillColor(254, 226, 226)
        doc.roundedRect(colStatus - 9.5, rowY - 3.2, 9, 4.2, 0.8, 0.8, 'F')
        doc.text('Urgjent', colStatus - 0.8, rowY - 0.3, { align: 'right' })
      } else {
        doc.setTextColor(21, 128, 61)
        doc.setFillColor(220, 252, 231)
        doc.roundedRect(colStatus - 9.5, rowY - 3.2, 9, 4.2, 0.8, 0.8, 'F')
        doc.text('Normal', colStatus - 0.8, rowY - 0.3, { align: 'right' })
      }
      doc.setDrawColor(241, 245, 249)
      doc.line(cardX + 2, rowY + 2, cardX + cardWidth - 2, rowY + 2)
      rowY += 5.6
    })

    const noteY = rowY + 2
    doc.setDrawColor(219, 234, 254)
    doc.setFillColor(248, 250, 252)
    doc.roundedRect(cardX + 2, noteY, cardWidth - 4, 8, 1, 1, 'FD')
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.1)
    doc.setTextColor(51, 65, 85)
    doc.text('Shenim: Ju lutem konfirmoni disponueshmerine dhe kohen e dorezimit.', cardX + 4, noteY + 5)
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
            ${s.createdByLabel ? `<span class="owner-note-text text-[10px] text-blue-700">nga ${s.createdByLabel}${s.createdByRole ? ` (${s.createdByRole})` : ''}</span>` : ''}
          </div>
        </td>
        <td data-label="Veprime" class="px-3 py-3 text-right">
          <div class="inline-flex items-center gap-1.5">
            <button data-action="copy-shortage-name" data-id="${s.id}" title="Kopjo detajet" class="ui-icon-btn">${iconCopy}</button>
            <button data-action="reassign-supplier" data-id="${s.id}" title="Ndrysho furnitorin" class="ui-icon-btn">${iconMenu}</button>
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
    allOrders = update(allOrders)
  }

  function getOrderById(orderId: number): OwnerOrder | undefined {
    return generatedOrders.find((o) => o.id === orderId) ?? allOrders.find((o) => o.id === orderId)
  }

  function resolveOrderFromBtn(btn: HTMLButtonElement): OwnerOrder | undefined {
    const dbId = btn.dataset.orderDbId?.trim()
    if (dbId) {
      return (
        generatedOrders.find((o) => o.dbId === dbId) ??
        allOrders.find((o) => o.dbId === dbId)
      )
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
    const ordersToRender = section === 'mungesat' ? generatedOrders : showAllOrders ? allOrders : generatedOrders
    if (!ordersToRender.length) {
      if (section === 'mungesat') {
        return `<div class="premium-empty">
          <div class="premium-empty-title">Nuk ka porosi të gjeneruara për sot</div>
          <p class="premium-empty-copy">Kliko «Gjenero porositë e ditës së sotme» për t'i krijuar porositë.</p>
        </div>`
      }
      return `<div class="premium-empty">
        <div class="premium-empty-title">${showAllOrders ? 'Nuk ka porosi në histori' : 'Nuk ka porosi të gjeneruara tani'}</div>
        <p class="premium-empty-copy">${
          showAllOrders
            ? 'Ende nuk ka porosi të ruajtura.'
            : 'Kliko «Gjenero porositë sipas furnitorit» për të krijuar porositë.'
        }</p>
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

  function renderDashboardPanel(): string {
    const trendData =
      dashboardInsights.shortageTrend.length > 0
        ? dashboardInsights.shortageTrend
        : buildEmptyDashboardInsights(dashboardRangeDays).shortageTrend
    const maxTrend = Math.max(...trendData.map((r) => r.count), 1)
    const chartW = 420
    const chartH = 150
    const padX = 18
    const padY = 14
    const innerW = chartW - padX * 2
    const innerH = chartH - padY * 2
    const pointCount = Math.max(trendData.length, 2)
    const stepX = pointCount > 1 ? innerW / (pointCount - 1) : 0
    const points = trendData.map((row, idx) => {
      const x = padX + idx * stepX
      const y = padY + innerH - (row.count / maxTrend) * innerH
      return { x, y, row }
    })
    const linePath = points
      .map((p, idx) => `${idx === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
      .join(' ')
    const areaPath =
      points.length > 0
        ? `${linePath} L${(padX + innerW).toFixed(1)},${(padY + innerH).toFixed(1)} L${padX.toFixed(1)},${(padY + innerH).toFixed(1)} Z`
        : ''
    const dotNodes = points
      .map(
        (p) => `
          <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3.2" fill="#2563eb" stroke="#ffffff" stroke-width="1.5" />
          <title>${p.row.date}: ${p.row.count} mungesa</title>`
      )
      .join('')
    const xLabelIndexes =
      points.length <= 10
        ? points.map((_, idx) => idx)
        : points.length <= 16
          ? [0, Math.floor((points.length - 1) / 2), points.length - 1]
          : [0, Math.floor((points.length - 1) / 3), Math.floor(((points.length - 1) * 2) / 3), points.length - 1]
    const xLabels = xLabelIndexes
      .map((idx) => {
        const p = points[idx]
        if (!p) return ''
        return `<span class="text-[10px] text-slate-500">${p.row.date.slice(5).replace('-', '/')}</span>`
      })
      .filter(Boolean)
      .join('')

    const maxSupplier = Math.max(...dashboardInsights.topSuppliers.map((s) => s.count), 1)
    const topSupplierRows = dashboardInsights.topSuppliers
      .map((item) => {
        const width = Math.max(8, Math.round((item.count / maxSupplier) * 100))
        return `
          <li class="rounded-lg border border-slate-200 bg-white px-3 py-2">
            <div class="mb-1 flex items-center justify-between gap-2 text-xs">
              <span class="truncate text-slate-700">${item.name}</span>
              <span class="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">${item.count}</span>
            </div>
            <div class="h-1.5 rounded-full bg-slate-100">
              <div class="h-1.5 rounded-full bg-emerald-500" style="width:${width}%"></div>
            </div>
          </li>`
      })
      .join('')
    const maxProduct = Math.max(...dashboardInsights.topProducts.map((s) => s.count), 1)
    const topProductRows = dashboardInsights.topProducts
      .map((item) => {
        const width = Math.max(8, Math.round((item.count / maxProduct) * 100))
        return `
          <li class="rounded-lg border border-slate-200 bg-white px-3 py-2">
            <div class="mb-1 flex items-center justify-between gap-2 text-xs">
              <span class="truncate text-slate-700">${item.name}</span>
              <span class="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">${item.count}</span>
            </div>
            <div class="h-1.5 rounded-full bg-slate-100">
              <div class="h-1.5 rounded-full bg-violet-500" style="width:${width}%"></div>
            </div>
          </li>`
      })
      .join('')
    const totalShortages = trendData.reduce((sum, row) => sum + row.count, 0)
    const avgDaily = trendData.length ? totalShortages / trendData.length : 0
    const peakPoint = trendData.reduce(
      (best, row) => (row.count > best.count ? row : best),
      { date: '', count: 0 }
    )
    const urgentTotal = Math.max(0, Number(dashboardInsights.urgentBreakdown.urgent ?? 0))
    const normalTotal = Math.max(0, Number(dashboardInsights.urgentBreakdown.normal ?? 0))
    const urgencyTotal = Math.max(urgentTotal + normalTotal, 1)
    const urgentPercent = Math.round((urgentTotal / urgencyTotal) * 100)
    const normalPercent = 100 - urgentPercent
    const weekdayData =
      dashboardInsights.weekdayTrend.length > 0
        ? dashboardInsights.weekdayTrend
        : buildEmptyDashboardInsights(dashboardRangeDays).weekdayTrend
    const maxWeekday = Math.max(...weekdayData.map((w) => w.count), 1)
    const weekdayRows = weekdayData
      .map((item) => {
        const width = Math.max(6, Math.round((item.count / maxWeekday) * 100))
        return `
          <li class="flex items-center gap-2">
            <span class="w-8 text-[10px] font-semibold text-slate-600">${item.day}</span>
            <div class="h-2 flex-1 rounded-full bg-slate-100">
              <div class="h-2 rounded-full bg-indigo-500" style="width:${width}%"></div>
            </div>
            <span class="w-7 text-right text-[10px] font-semibold text-slate-700">${item.count}</span>
          </li>`
      })
      .join('')
    const busiestWeekday = weekdayData.reduce(
      (best, row) => (row.count > best.count ? row : best),
      { day: '—', count: 0 }
    )
    const riskLabel =
      urgentPercent >= 45 ? 'Rrezik i lartë' : urgentPercent >= 25 ? 'Rrezik mesatar' : 'Rrezik i ulët'
    const quickFocus =
      busiestWeekday.count > 0
        ? `Fokuso porositë preventive të ${busiestWeekday.day} (kulmi: ${busiestWeekday.count}).`
        : 'Nuk ka mjaftueshëm të dhëna për fokus javor.'
    return `
      <div class="premium-card p-4">
        <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div>
            <h2 class="text-base font-semibold text-slate-900">Dashboard</h2>
            <p class="text-xs text-slate-500">Pamje e shpejtë e operimeve.</p>
          </div>
          <div class="inline-flex items-center gap-2">
            <div class="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1">
              <button data-action="dashboard-range" data-days="7" class="${dashboardRangeDays === 7 ? 'premium-btn-primary' : 'premium-btn-ghost'} rounded-md px-2.5 py-1 text-[11px] font-semibold">7d</button>
              <button data-action="dashboard-range" data-days="14" class="${dashboardRangeDays === 14 ? 'premium-btn-primary' : 'premium-btn-ghost'} rounded-md px-2.5 py-1 text-[11px] font-semibold">14d</button>
              <button data-action="dashboard-range" data-days="30" class="${dashboardRangeDays === 30 ? 'premium-btn-primary' : 'premium-btn-ghost'} rounded-md px-2.5 py-1 text-[11px] font-semibold">30d</button>
            </div>
            <a href="#/pronari/mungesat" class="premium-btn-primary inline-flex items-center rounded-lg px-3 py-1.5 text-xs font-semibold">Shko te mungesat</a>
            <a href="#/porosite" class="premium-btn-ghost inline-flex items-center rounded-lg px-3 py-1.5 text-xs font-medium">Shiko porositë</a>
          </div>
        </div>
        <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div class="rounded-xl border border-slate-200 bg-slate-50 p-3 xl:col-span-2">
            <p class="mb-2 text-xs font-semibold text-slate-700">Trend ${dashboardRangeDays}-ditor i mungesave</p>
            ${
              trendData.length
                ? `<div class="rounded-lg border border-slate-200 bg-white p-2">
                    <svg viewBox="0 0 ${chartW} ${chartH}" class="h-36 w-full" preserveAspectRatio="xMidYMid meet" aria-label="Trend i mungesave">
                      <defs>
                        <linearGradient id="owner-dashboard-trend-fill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.28"></stop>
                          <stop offset="100%" stop-color="#3b82f6" stop-opacity="0.02"></stop>
                        </linearGradient>
                      </defs>
                      <line x1="${padX}" y1="${padY + innerH}" x2="${padX + innerW}" y2="${padY + innerH}" stroke="#cbd5e1" stroke-width="1"></line>
                      <line x1="${padX}" y1="${padY}" x2="${padX}" y2="${padY + innerH}" stroke="#e2e8f0" stroke-width="1"></line>
                      ${areaPath ? `<path d="${areaPath}" fill="url(#owner-dashboard-trend-fill)"></path>` : ''}
                      ${linePath ? `<path d="${linePath}" fill="none" stroke="#2563eb" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"></path>` : ''}
                      ${dotNodes}
                    </svg>
                    <div class="mt-1 flex items-center justify-between gap-1 text-center">${xLabels}</div>
                  </div>`
                : '<p class="text-xs text-slate-500">Nuk ka të dhëna trendi.</p>'
            }
          </div>
          <div class="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p class="mb-2 text-xs font-semibold text-slate-700">Top furnitorët (${dashboardRangeDays} ditë)</p>
            <ul class="space-y-1.5">${topSupplierRows || '<li class="text-xs text-slate-500">Nuk ka të dhëna.</li>'}</ul>
          </div>
          <div class="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p class="mb-2 text-xs font-semibold text-slate-700">Top produktet (${dashboardRangeDays} ditë)</p>
            <ul class="space-y-1.5">${topProductRows || '<li class="text-xs text-slate-500">Nuk ka të dhëna.</li>'}</ul>
          </div>
          <div class="rounded-xl border border-slate-200 bg-slate-50 p-3 xl:col-span-2">
            <p class="mb-2 text-xs font-semibold text-slate-700">Urgjente vs normale</p>
            <div class="flex items-center gap-3">
              <div
                class="h-20 w-20 rounded-full"
                style="background:conic-gradient(#ef4444 ${urgentPercent}%, #10b981 ${urgentPercent}% 100%);"
              >
                <div class="m-2 flex h-16 w-16 items-center justify-center rounded-full bg-white text-[10px] font-semibold text-slate-700">
                  ${urgentPercent}%
                </div>
              </div>
              <div class="space-y-1 text-[11px]">
                <p class="text-slate-700"><span class="font-semibold text-rose-600">Urgjente:</span> ${urgentTotal}</p>
                <p class="text-slate-700"><span class="font-semibold text-emerald-600">Normale:</span> ${normalTotal}</p>
                <p class="text-slate-500">Raporti: ${urgentPercent}% / ${normalPercent}%</p>
              </div>
            </div>
          </div>
          <div class="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p class="mb-2 text-xs font-semibold text-slate-700">Mungesa sipas ditës së javës</p>
            <ul class="space-y-1.5">${weekdayRows || '<li class="text-xs text-slate-500">Nuk ka të dhëna.</li>'}</ul>
          </div>
          <div class="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p class="mb-2 text-xs font-semibold text-slate-700">Insight i shpejtë</p>
            <div class="space-y-2 text-[11px] text-slate-700">
              <p><span class="font-semibold text-slate-900">Mungesa totale:</span> ${totalShortages}</p>
              <p><span class="font-semibold text-slate-900">Mesatarja ditore:</span> ${avgDaily.toFixed(1)}</p>
              <p><span class="font-semibold text-slate-900">Dita me kulm:</span> ${peakPoint.date ? `${peakPoint.date} (${peakPoint.count})` : '—'}</p>
              <p><span class="font-semibold text-slate-900">Dita më e ngarkuar:</span> ${busiestWeekday.day} (${busiestWeekday.count})</p>
              <p><span class="font-semibold text-slate-900">Status urgjence:</span> ${riskLabel}</p>
            </div>
            <p class="mt-3 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[10px] text-slate-600">${quickFocus}</p>
          </div>
        </div>
      </div>
    `
  }

  function renderProfilePanel(): string {
    const roleValue =
      accountInfo.role === 'OWNER' || accountInfo.role === 'MANAGER' || accountInfo.role === 'WORKER'
        ? accountInfo.role
        : 'OWNER'
    return `
      <div class="premium-card p-4">
        <h2 class="text-base font-semibold text-slate-900">Profili</h2>
        <form id="owner-profile-edit-form" class="mt-3 space-y-3">
          <div class="grid gap-2 sm:grid-cols-2">
            <label class="text-xs text-slate-700">
              Emri
              <input id="owner-profile-first-name" type="text" value="${accountInfo.firstName || ''}" class="premium-input mt-1 w-full rounded-lg px-2.5 py-1.5 text-xs focus:outline-none" />
            </label>
            <label class="text-xs text-slate-700">
              Mbiemri
              <input id="owner-profile-last-name" type="text" value="${accountInfo.lastName || ''}" class="premium-input mt-1 w-full rounded-lg px-2.5 py-1.5 text-xs focus:outline-none" />
            </label>
            <label class="text-xs text-slate-700">
              Username
              <input id="owner-profile-username" type="text" value="${accountInfo.username || ''}" placeholder="username" class="premium-input mt-1 w-full rounded-lg px-2.5 py-1.5 text-xs focus:outline-none" />
            </label>
            <label class="text-xs text-slate-700">
              Email
              <input id="owner-profile-email-input" type="text" value="${accountInfo.email === '—' ? '' : accountInfo.email}" placeholder="email@domain.com" class="premium-input mt-1 w-full rounded-lg px-2.5 py-1.5 text-xs focus:outline-none" />
            </label>
            <label class="text-xs text-slate-700">
              Roli
              <select id="owner-profile-role-input" class="premium-input mt-1 w-full rounded-lg px-2.5 py-1.5 text-xs focus:outline-none">
                <option value="OWNER" ${roleValue === 'OWNER' ? 'selected' : ''}>ADMIN</option>
                <option value="MANAGER" ${roleValue === 'MANAGER' ? 'selected' : ''}>MANAGER</option>
                <option value="WORKER" ${roleValue === 'WORKER' ? 'selected' : ''}>WORKER</option>
              </select>
            </label>
            <div class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <p class="text-[11px] uppercase tracking-wide text-slate-500">Sesioni</p>
              <p class="mt-1 text-xs font-medium text-slate-900">${accountInfo.sessionMode} • ${accountInfo.provider}</p>
            </div>
            <label class="text-xs text-slate-700">
              Fjalëkalimi i ri
              <input id="owner-profile-new-password" type="password" placeholder="Minimum 6 karaktere" class="premium-input mt-1 w-full rounded-lg px-2.5 py-1.5 text-xs focus:outline-none" />
            </label>
            <label class="text-xs text-slate-700">
              Konfirmo fjalëkalimin
              <input id="owner-profile-confirm-password" type="password" placeholder="Përsërite fjalëkalimin" class="premium-input mt-1 w-full rounded-lg px-2.5 py-1.5 text-xs focus:outline-none" />
            </label>
          </div>
          <div class="flex flex-wrap items-center justify-between gap-2">
            <p class="text-[11px] text-slate-500">User ID është hequr nga UI. Ruaj këtu ndryshimet e profilit dhe fjalëkalimit.</p>
            <button type="submit" class="premium-btn-primary rounded-lg px-3 py-1.5 text-xs font-semibold">Ruaj ndryshimet</button>
          </div>
        </form>
      </div>
    `
  }

  function renderSettingsPanel(): string {
    if (!canSeeSettings) {
      return `
        <div class="premium-card p-4">
          <h2 class="text-base font-semibold text-slate-900">Settings</h2>
          <p class="mt-2 text-xs text-slate-500">Vetëm OWNER mund t'i shikojë settings.</p>
        </div>
      `
    }
    const managedUsers = mergeTeamUsers(teamUsers, readPendingSettingsUsers())
      .slice()
      .sort((a, b) => compareAlbanian(a.username || a.email, b.username || b.email))
    const displayUsers =
      managedUsers.length > 0
        ? managedUsers
        : [
            {
              id: accountInfo.userId || 'current-admin',
              email: accountInfo.email || '—',
              username:
                [accountInfo.firstName, accountInfo.lastName].filter(Boolean).join(' ').trim() ||
                accountInfo.email?.split('@')[0] ||
                'admin',
              role: accountInfo.role || 'OWNER',
              isActive: true,
              createdAt: '',
              lastSignInAt: '',
              shortagesToday: 0,
              ordersSentToday: 0,
              shortagesTotal: 0,
              lastShortageAt: '',
            },
          ]
    const totalUsers = displayUsers.length
    const totalAdmins = displayUsers.filter((u) => String(u.role).toUpperCase() === 'OWNER').length
    const totalManagers = displayUsers.filter((u) => String(u.role).toUpperCase() === 'MANAGER').length
    const totalWorkers = displayUsers.filter((u) => String(u.role).toUpperCase() === 'WORKER').length
    const totalActive = displayUsers.filter((u) => u.isActive).length
    const activePercent = totalUsers > 0 ? Math.max(0, Math.min(100, Math.round((totalActive / totalUsers) * 100))) : 0
    const fmtDate = (raw: string): string => {
      if (!raw) return '—'
      const d = new Date(raw)
      if (Number.isNaN(d.getTime())) return '—'
      return d.toLocaleString('sq-AL', { dateStyle: 'short', timeStyle: 'short' })
    }
    const rows = displayUsers
      .map((u, idx) => {
        const isSelf = u.id === accountInfo.userId
        const role = u.role === 'OWNER' ? 'OWNER' : u.role === 'MANAGER' ? 'MANAGER' : 'WORKER'
        const canManage = !isSelf
        const safeId = u.id.replace(/[^a-zA-Z0-9_-]/g, '')
        const rowId = `owner-user-row-${safeId}`
        const usernameInputId = `owner-user-username-${safeId}`
        const roleInputId = `owner-user-role-${safeId}`
        const activeInputId = `owner-user-active-${safeId}`
        const saveBtnId = `owner-user-save-${safeId}`
        const cancelBtnId = `owner-user-cancel-${safeId}`
        const editBtnId = `owner-user-edit-${safeId}`
        const roleBadgeClass =
          role === 'OWNER'
            ? 'bg-violet-100 text-violet-800 border-violet-200'
            : role === 'MANAGER'
              ? 'bg-blue-100 text-blue-800 border-blue-200'
              : 'bg-slate-100 text-slate-700 border-slate-200'
        const initials = (u.username || u.email || 'U').slice(0, 1).toUpperCase()
        return `
          <tr data-settings-row="${rowId}" class="border-t border-slate-200/80 text-[11px] transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} hover:bg-violet-50/60">
            <td class="px-3 py-2.5 text-slate-800">
              <div class="flex items-center gap-2.5">
                <span class="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-[10px] font-semibold text-white">${initials}</span>
                <div class="min-w-0 flex-1">
                  <p class="truncate text-[11px] font-semibold text-slate-900">${u.username || 'Përdorues'}</p>
                  <p class="truncate text-[10px] text-slate-500">${u.email || '—'}</p>
                </div>
              </div>
              <div class="mt-2 flex flex-wrap items-center gap-2">
                <input
                  id="${usernameInputId}"
                  type="text"
                  value="${u.username || ''}"
                  placeholder="Shkruaj username..."
                  data-edit-target="1"
                  class="premium-input min-w-36 flex-1 rounded-xl border-slate-300 bg-white px-2.5 py-1.5 text-[11px] shadow-sm focus:outline-none disabled:cursor-not-allowed disabled:opacity-70"
                  ${canManage ? 'disabled' : 'disabled'}
                />
              </div>
            </td>
            <td class="px-3 py-2.5 align-top">
              <div class="flex flex-wrap items-center gap-2">
                <span class="inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold ${roleBadgeClass}">${role === 'OWNER' ? 'ADMIN' : role}</span>
                <select
                  id="${roleInputId}"
                  data-edit-target="1"
                  class="premium-input rounded-xl border-slate-300 bg-white px-2.5 py-1.5 text-[11px] shadow-sm transition hover:border-indigo-300 focus:outline-none disabled:cursor-not-allowed disabled:opacity-70"
                  ${canManage ? 'disabled' : 'disabled'}
                >
                  <option value="OWNER" ${role === 'OWNER' ? 'selected' : ''}>ADMIN</option>
                  <option value="MANAGER" ${role === 'MANAGER' ? 'selected' : ''}>MANAGER</option>
                  <option value="WORKER" ${role === 'WORKER' ? 'selected' : ''}>WORKER</option>
                </select>
              </div>
              <div class="mt-2 inline-flex items-center gap-2">
                <label class="inline-flex items-center gap-1 text-[11px] text-slate-600">
                  <input id="${activeInputId}" type="checkbox" data-edit-target="1" class="h-3.5 w-3.5" ${u.isActive ? 'checked' : ''} ${canManage ? 'disabled' : 'disabled'} />
                  Aktiv
                </label>
                <span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${u.isActive ? 'border border-emerald-300 bg-emerald-100 text-emerald-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]' : 'border border-slate-300 bg-slate-100 text-slate-600'}">${u.isActive ? 'Aktiv' : 'Joaktiv'}</span>
              </div>
            </td>
            <td class="px-3 py-2.5 align-top text-[10px] text-slate-500">
              <p class="font-medium text-slate-700">Krijuar: <span class="text-slate-500">${fmtDate(u.createdAt)}</span></p>
              <p class="mt-1 font-medium text-slate-700">Hyrja fundit: <span class="text-slate-500">${fmtDate(u.lastSignInAt)}</span></p>
            </td>
            <td class="px-3 py-2.5 text-right align-top">
              ${
                canManage
                  ? `<div class="inline-flex flex-wrap items-center justify-end gap-2">
                      <button
                        id="${editBtnId}"
                        data-action="edit-user-row"
                        data-user-id="${u.id}"
                        data-row-id="${rowId}"
                        data-save-btn-id="${saveBtnId}"
                        data-cancel-btn-id="${cancelBtnId}"
                        class="rounded-full border border-slate-300 bg-white px-3 py-1 text-[10px] font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        <span class="inline-flex items-center gap-1">
                          <svg viewBox="0 0 20 20" fill="none" class="h-3.5 w-3.5" aria-hidden="true">
                            <path d="M13.96 3.5a1.8 1.8 0 0 1 2.54 2.54L8.2 14.34 5 15l.66-3.2 8.3-8.3Z" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
                          </svg>
                          Edito
                        </span>
                      </button>
                      <button
                        id="${saveBtnId}"
                        data-action="save-user-row"
                        data-user-id="${u.id}"
                        data-username-input-id="${usernameInputId}"
                        data-role-select-id="${roleInputId}"
                        data-active-input-id="${activeInputId}"
                        disabled
                        class="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-[10px] font-semibold text-indigo-700 hover:bg-indigo-100 disabled:pointer-events-none disabled:opacity-50"
                      >
                        <span class="inline-flex items-center gap-1">
                          <svg viewBox="0 0 20 20" fill="none" class="h-3.5 w-3.5" aria-hidden="true">
                            <path d="M4.5 3.5h9l2 2v11h-11v-13Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>
                            <path d="M7 3.5v4h6v-4M7 16.5v-4.5h6v4.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
                          </svg>
                          Ruaj
                        </span>
                      </button>
                      <button
                        id="${cancelBtnId}"
                        data-action="cancel-user-row"
                        data-row-id="${rowId}"
                        data-edit-btn-id="${editBtnId}"
                        disabled
                        class="rounded-full border border-slate-300 bg-slate-100 px-3 py-1 text-[10px] font-semibold text-slate-600 hover:bg-slate-200 disabled:pointer-events-none disabled:opacity-50"
                      >
                        Anulo
                      </button>
                      <button data-action="delete-user" data-user-id="${u.id}" class="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-[10px] font-semibold text-rose-700 hover:bg-rose-100">
                        <span class="inline-flex items-center gap-1">
                          <svg viewBox="0 0 20 20" fill="none" class="h-3.5 w-3.5" aria-hidden="true">
                            <path d="M4.5 6h11M8 3.8h4M7 8.2v6M10 8.2v6M13 8.2v6M6 6l.6 10.3h6.8L14 6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
                          </svg>
                          Fshije
                        </span>
                      </button>
                    </div>`
                  : `<span class="text-[10px] text-slate-500">${isSelf ? 'Ti (admin)' : 'Pa leje'}</span>`
              }
            </td>
          </tr>
        `
      })
      .join('')
    return `
      <div class="space-y-5">
      <div class="premium-card overflow-hidden border border-emerald-200/70 bg-gradient-to-br from-white via-slate-50 to-emerald-50/40 p-0 shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
        <div class="border-b border-emerald-100 bg-gradient-to-r from-white via-slate-50 to-emerald-50 px-5 py-4 text-slate-900">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 class="text-lg font-semibold tracking-tight">Settings</h2>
              <p class="mt-1 text-xs text-slate-600">Panel premium për menaxhimin e aksesit dhe përdoruesve të kompanisë.</p>
            </div>
            <span class="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-semibold text-emerald-800">OWNER ONLY</span>
          </div>
        </div>
        <div class="grid gap-4 p-5 xl:grid-cols-[1.25fr_1fr]">
          <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div class="mb-3 flex items-center justify-between">
              <h3 class="text-xs font-semibold uppercase tracking-wide text-slate-500">Krijo përdorues të ri</h3>
              <span class="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">Akses i menjëhershëm</span>
            </div>
            <form id="owner-create-user-form" class="grid gap-3 md:grid-cols-2">
              <label class="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Username
                <input id="owner-new-user-username" type="text" placeholder="Shkruaj username..." class="premium-input mt-1 w-full rounded-xl border-slate-300 bg-white px-3 py-2 text-[11px] focus:outline-none" />
              </label>
              <label class="text-[10px] font-medium normal-case tracking-normal text-slate-500 md:col-span-2">
                Useri mund të kyçet me username. Email-i teknik krijohet automatikisht.
              </label>
              <label class="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Password
                <input id="owner-new-user-password" type="password" placeholder="Shkruaj fjalëkalimin..." class="premium-input mt-1 w-full rounded-xl border-slate-300 bg-white px-3 py-2 text-[11px] focus:outline-none" />
              </label>
              <label class="text-[10px] font-semibold uppercase tracking-wide text-slate-500 md:col-span-1">
                Roli
                <select id="owner-new-user-role" class="premium-input mt-1 w-full rounded-xl border-slate-300 bg-white px-3 py-2 text-[11px] transition hover:border-emerald-300 focus:outline-none">
                  <option value="OWNER">ADMIN</option>
                  <option value="MANAGER">MANAGER</option>
                  <option value="WORKER">WORKER</option>
                </select>
              </label>
              <div class="flex items-end md:col-span-1">
                <button type="submit" class="premium-btn-primary h-10 w-full rounded-xl px-4 py-2 text-[12px] font-semibold shadow-sm">
                  <span class="inline-flex items-center gap-1.5">
                    <svg viewBox="0 0 20 20" fill="none" class="h-4 w-4" aria-hidden="true">
                      <path d="M10 4.2v11.6M4.2 10h11.6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                    </svg>
                    Krijo përdorues
                  </span>
                </button>
              </div>
            </form>
          </div>
          <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 class="text-xs font-semibold uppercase tracking-wide text-slate-500">Përmbledhje e ekipës</h3>
            <div class="mt-3 grid gap-2 sm:grid-cols-2">
              <div class="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <p class="text-[10px] uppercase tracking-wide text-slate-500">Total</p>
                <p class="text-base font-semibold text-slate-900">${totalUsers}</p>
              </div>
              <div class="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
                <p class="text-[10px] uppercase tracking-wide text-emerald-700">Admin</p>
                <p class="text-base font-semibold text-emerald-900">${totalAdmins}</p>
              </div>
              <div class="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2">
                <p class="text-[10px] uppercase tracking-wide text-blue-700">Manager</p>
                <p class="text-base font-semibold text-blue-900">${totalManagers}</p>
              </div>
              <div class="rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2">
                <p class="text-[10px] uppercase tracking-wide text-indigo-700">Worker</p>
                <p class="text-base font-semibold text-indigo-900">${totalWorkers}</p>
              </div>
            </div>
            <div class="mt-3 rounded-xl border border-emerald-300 bg-linear-to-r from-emerald-50 to-white px-3 py-2 shadow-sm">
              <div class="flex items-center justify-between">
                <p class="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide text-emerald-700">
                  <span class="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                  Aktiv
                </p>
                <p class="rounded-full border border-emerald-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-emerald-800">${activePercent}%</p>
              </div>
              <p class="mt-0.5 text-sm font-semibold text-emerald-900">${totalActive} përdorues aktiv</p>
              <div class="mt-2 h-2 overflow-hidden rounded-full bg-emerald-100 ring-1 ring-emerald-200">
                <div class="h-full rounded-full bg-linear-to-r from-emerald-500 to-teal-500 transition-all duration-500 ease-out" style="width:${activePercent}%"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="premium-card border border-slate-200/80 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
        <div class="mb-3 flex items-center justify-between gap-2">
          <div>
            <h3 class="text-sm font-semibold text-slate-900">Lista e përdoruesve</h3>
            <p class="text-[11px] text-slate-500">Kliko "Edito" për të hapur fushat, pastaj "Ruaj" ose "Anulo".</p>
          </div>
          <span class="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] text-slate-600">${displayUsers.length} përdorues</span>
        </div>
        <div class="mt-2 overflow-auto rounded-2xl border border-slate-200">
          <table class="min-w-full text-[11px]">
            <thead class="bg-slate-100/90 text-slate-700">
              <tr>
                <th class="px-3 py-2 text-left font-semibold">Përdoruesi</th>
                <th class="px-3 py-2 text-left font-semibold">Aksesi</th>
                <th class="px-3 py-2 text-left font-semibold">Aktiviteti</th>
                <th class="px-3 py-2 text-right font-semibold">Veprime</th>
              </tr>
            </thead>
            <tbody class="[&>tr:nth-child(even)]:bg-slate-50/40">
              ${rows || '<tr><td colspan="4" class="px-2 py-3 text-center text-slate-500">Nuk ka përdorues.</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
      </div>
    `
  }

  function renderCompanyPanel(): string {
    return `
      <div class="premium-card p-4">
        <h2 class="text-base font-semibold text-slate-900">Detajet e kompanisë</h2>
        <p class="mt-2 text-xs text-slate-500">Këto të dhëna përdoren në dokumente/PDF dhe header të kompanisë.</p>
        <div class="mt-3 grid gap-2 sm:grid-cols-2">
          <label class="text-xs text-slate-700">
            Emri i kompanisë
            <input id="owner-company-name" type="text" value="${companyDetails.name || ''}" class="premium-input mt-1 w-full rounded-lg px-2.5 py-1.5 text-xs focus:outline-none" />
          </label>
          <label class="text-xs text-slate-700">
            Emri POS
            <input id="owner-company-pos-name" type="text" value="${companyDetails.posName || ''}" class="premium-input mt-1 w-full rounded-lg px-2.5 py-1.5 text-xs focus:outline-none" />
          </label>
          <label class="text-xs text-slate-700">
            Telefoni
            <input id="owner-company-phone" type="text" value="${companyDetails.phone || ''}" class="premium-input mt-1 w-full rounded-lg px-2.5 py-1.5 text-xs focus:outline-none" />
          </label>
          <label class="text-xs text-slate-700">
            Email
            <input id="owner-company-email" type="email" value="${companyDetails.email || accountInfo.email || ''}" class="premium-input mt-1 w-full rounded-lg px-2.5 py-1.5 text-xs focus:outline-none" />
          </label>
          <label class="text-xs text-slate-700 sm:col-span-2">
            Adresa
            <input id="owner-company-address" type="text" value="${companyDetails.address || ''}" class="premium-input mt-1 w-full rounded-lg px-2.5 py-1.5 text-xs focus:outline-none" />
          </label>
          <label class="text-xs text-slate-700 sm:col-span-2">
            Logo URL (opsional)
            <input id="owner-company-logo-url" type="text" value="${companyDetails.logoUrl || ''}" class="premium-input mt-1 w-full rounded-lg px-2.5 py-1.5 text-xs focus:outline-none" />
          </label>
          <label class="text-xs text-slate-700 sm:col-span-2">
            Info shtesë
            <textarea id="owner-company-other-info" rows="3" class="premium-input mt-1 w-full rounded-lg px-2.5 py-1.5 text-xs focus:outline-none">${companyDetails.otherInfo || ''}</textarea>
          </label>
        </div>
        <div class="mt-3">
          <button data-action="save-company-details" class="premium-btn-primary rounded-lg px-3 py-1.5 text-xs font-semibold">Ruaj të dhënat e kompanisë</button>
        </div>
      </div>
    `
  }

  function renderTeamPanel(): string {
    if (!canSeeSettings) {
      return `
        <div class="premium-card p-4">
          <h2 class="text-base font-semibold text-slate-900">Ekipa</h2>
          <p class="mt-2 text-xs text-slate-500">Vetëm OWNER mund ta shikojë panelin e ekipës.</p>
        </div>
      `
    }
    const displayTeamUsers =
      teamUsers.length > 0
        ? teamUsers
        : [
            {
              id: accountInfo.userId || 'current-admin',
              email: accountInfo.email || '—',
              username:
                [accountInfo.firstName, accountInfo.lastName].filter(Boolean).join(' ').trim() ||
                accountInfo.username ||
                accountInfo.email?.split('@')[0] ||
                'admin',
              role: accountInfo.role || 'OWNER',
              isActive: true,
              createdAt: '',
              lastSignInAt: '',
              shortagesToday: 0,
              ordersSentToday: 0,
              shortagesTotal: 0,
              lastShortageAt: '',
            },
          ]
    const total = displayTeamUsers.length
    const owners = displayTeamUsers.filter((u) => u.role === 'OWNER').length
    const managers = displayTeamUsers.filter((u) => u.role === 'MANAGER').length
    const workers = displayTeamUsers.filter((u) => u.role === 'WORKER').length
    const activeUsers = displayTeamUsers.filter((u) => u.isActive).length
    const fmtDate = (raw: string): string => {
      if (!raw) return '—'
      const d = new Date(raw)
      if (Number.isNaN(d.getTime())) return '—'
      return d.toLocaleString('sq-AL')
    }
    const cards = displayTeamUsers
      .map(
        (u) => `
          <article class="rounded-xl border border-slate-200 bg-white p-3">
            <div class="mb-2 flex items-start justify-between gap-2">
              <div class="min-w-0">
                <p class="truncate text-sm font-semibold text-slate-900">${u.username || (u.email ? String(u.email).split('@')[0] : 'Përdorues')}</p>
                <p class="truncate text-[11px] text-slate-500">${u.email || '—'}</p>
              </div>
              <span class="rounded-full px-2 py-0.5 text-[10px] font-semibold ${u.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}">${u.isActive ? 'Aktiv' : 'Joaktiv'}</span>
            </div>
            <div class="grid gap-2 text-[11px] text-slate-600 sm:grid-cols-2">
              <div><span class="text-slate-500">Roli:</span> <span class="font-semibold text-slate-800">${u.role}</span></div>
              <div><span class="text-slate-500">Kyçja e parë:</span> <span class="font-medium text-slate-800">${fmtDate(u.createdAt)}</span></div>
              <div><span class="text-slate-500">Aktiv për herë të fundit:</span> <span class="font-medium text-slate-800">${fmtDate((() => {
                const a = u.lastSignInAt ? new Date(u.lastSignInAt).getTime() : 0
                const b = u.lastShortageAt ? new Date(u.lastShortageAt).getTime() : 0
                return a >= b ? u.lastSignInAt : u.lastShortageAt
              })())}</span></div>
              <div><span class="text-slate-500">Mungesa totale:</span> <span class="font-medium text-slate-800">${u.shortagesTotal}</span></div>
              <div class="sm:col-span-2"><span class="text-slate-500">Paraqitja e fundit:</span> <span class="font-medium text-slate-800">${fmtDate(u.lastShortageAt)}</span></div>
            </div>
          </article>`
      )
      .join('')
    return `
      <div class="premium-card p-4">
        <h2 class="text-base font-semibold text-slate-900">Ekipa</h2>
        <p class="mt-2 text-xs text-slate-500">Pasqyrë e përdoruesve dhe aktivitetit ditor të kompanisë.</p>
        <div class="mt-3 grid gap-2 sm:grid-cols-5">
          <div class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs"><span class="text-slate-500">Total</span><p class="text-sm font-semibold text-slate-900">${total}</p></div>
          <div class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs"><span class="text-slate-500">Owner</span><p class="text-sm font-semibold text-slate-900">${owners}</p></div>
          <div class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs"><span class="text-slate-500">Manager</span><p class="text-sm font-semibold text-slate-900">${managers}</p></div>
          <div class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs"><span class="text-slate-500">Worker</span><p class="text-sm font-semibold text-slate-900">${workers}</p></div>
          <div class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs"><span class="text-slate-500">Aktiv</span><p class="text-sm font-semibold text-slate-900">${activeUsers}</p></div>
        </div>
        ${
          teamLoading
            ? '<p class="mt-3 text-xs text-slate-500">Duke ngarkuar ekipën...</p>'
            : teamLoadError
              ? `<p class="mt-3 text-xs text-red-600">${teamLoadError}</p>`
              : `<div class="mt-3 grid gap-2 md:grid-cols-2">${cards || '<p class="text-xs text-slate-500">Nuk ka përdorues për këtë kompani.</p>'}</div>`
        }
      </div>
    `
  }

  function bindProfileFormHandler(): void {
    const profileForm = document.getElementById('owner-profile-edit-form') as HTMLFormElement | null
    if (!profileForm || profileForm.dataset.bound === '1') return
    profileForm.dataset.bound = '1'
    profileForm.addEventListener('submit', async (event) => {
      event.preventDefault()
      const firstNameInput = document.getElementById('owner-profile-first-name') as HTMLInputElement | null
      const lastNameInput = document.getElementById('owner-profile-last-name') as HTMLInputElement | null
      const usernameInput = document.getElementById('owner-profile-username') as HTMLInputElement | null
      const emailInput = document.getElementById('owner-profile-email-input') as HTMLInputElement | null
      const roleInput = document.getElementById('owner-profile-role-input') as HTMLSelectElement | null
      const newPasswordInput = document.getElementById('owner-profile-new-password') as HTMLInputElement | null
      const confirmPasswordInput = document.getElementById('owner-profile-confirm-password') as HTMLInputElement | null
      const saveBtn = profileForm.querySelector('button[type="submit"]') as HTMLButtonElement | null

      const firstName = String(firstNameInput?.value ?? '').trim()
      const lastName = String(lastNameInput?.value ?? '').trim()
      const username = String(usernameInput?.value ?? '').trim()
      const email = String(emailInput?.value ?? '').trim().toLowerCase()
      const role =
        roleInput?.value === 'MANAGER' || roleInput?.value === 'WORKER' ? roleInput.value : 'OWNER'
      const newPassword = String(newPasswordInput?.value ?? '')
      const confirmPassword = String(confirmPasswordInput?.value ?? '')

      if (!username || !/^[a-z0-9._-]{3,32}$/i.test(username)) {
        showToast('Username: 3-32 karaktere (a-z, 0-9, ., _, -).')
        usernameInput?.focus()
        return
      }
      if (email && !email.includes('@')) {
        showToast('Email nuk është valid.')
        emailInput?.focus()
        return
      }
      if (newPassword) {
        if (newPassword.length < 6) {
          showToast('Fjalëkalimi duhet të ketë minimum 6 karaktere.')
          newPasswordInput?.focus()
          return
        }
        if (newPassword !== confirmPassword) {
          showToast('Konfirmimi i fjalëkalimit nuk përputhet.')
          confirmPasswordInput?.focus()
          return
        }
      }

      if (saveBtn) saveBtn.disabled = true
      try {
        if (isSupabaseConfigured) {
          const updatePayload: { email?: string; data: Record<string, string> } = {
            data: {
              first_name: firstName,
              last_name: lastName,
              username,
            },
          }
          if (email && email !== accountInfo.email) updatePayload.email = email
          const baseUpdate = await supabase.auth.updateUser(updatePayload)
          if (baseUpdate.error) throw new Error(baseUpdate.error.message)

          if (newPassword) {
            const passwordUpdate = await supabase.auth.updateUser({ password: newPassword })
            if (passwordUpdate.error) throw new Error(passwordUpdate.error.message)
          }

          if (accountInfo.userId && accountInfo.userId !== '—') {
            if (username !== accountInfo.username) {
              const userNameResult = await adminUpdateUsername(accountInfo.userId, username)
              if (!userNameResult.ok) throw new Error(userNameResult.message)
            }
            if (role !== accountInfo.role) {
              const roleResult = await adminUpdateUserRole(accountInfo.userId, role)
              if (!roleResult.ok) throw new Error(roleResult.message)
            }
          }
        }

        accountInfo = {
          ...accountInfo,
          firstName,
          lastName,
          username,
          email: email || accountInfo.email,
          role,
        }
        if (newPasswordInput) newPasswordInput.value = ''
        if (confirmPasswordInput) confirmPasswordInput.value = ''
        await loadAccountInfo()
        refreshUI()
        showToast(newPassword ? 'Profili dhe fjalëkalimi u ruajtën.' : 'Profili u ruajt me sukses.')
      } catch (error) {
        const msg =
          error instanceof Error && error.message
            ? error.message
            : 'Nuk u ruajt profili. Provo përsëri.'
        showToast(msg)
      } finally {
        if (saveBtn) saveBtn.disabled = false
      }
    })
  }

  function bindSettingsFormHandler(): void {
    const createUserForm = document.getElementById('owner-create-user-form') as HTMLFormElement | null
    if (!createUserForm || createUserForm.dataset.bound === '1') return
    createUserForm.dataset.bound = '1'
    createUserForm.addEventListener('submit', async (event) => {
      event.preventDefault()
      if (!canSeeSettings) {
        showToast('Vetëm OWNER mund të shtojë përdorues.')
        return
      }
      const usernameInput = document.getElementById('owner-new-user-username') as HTMLInputElement | null
      const passwordInput = document.getElementById('owner-new-user-password') as HTMLInputElement | null
      const roleInput = document.getElementById('owner-new-user-role') as HTMLSelectElement | null
      const username = (usernameInput?.value ?? '').trim().toLocaleLowerCase('sq-AL')
      const password = passwordInput?.value ?? ''
      const role =
        roleInput?.value === 'OWNER'
          ? 'OWNER'
          : roleInput?.value === 'MANAGER'
            ? 'MANAGER'
            : 'WORKER'
      if (!username) {
        showToast('Shkruaj username.')
        return
      }
      if (!/^[a-z0-9._-]{3,32}$/.test(username)) {
        showToast('Username: 3-32 karaktere (a-z, 0-9, ., _, -).')
        return
      }
      const result = await adminCreateUser({ username, password, role })
      console.log('adminCreateUser result:', result)
      if (!result.ok) {
        showToast(result.message || 'Krijimi i përdoruesit dështoi.')
        return
      }
      createUserForm.reset()
      const generatedEmail = `${username}@flowinventory.local`
      const optimisticUser: TeamUser = {
        id: result.userId,
        email: generatedEmail,
        username,
        role,
        isActive: true,
        createdAt: new Date().toISOString(),
        lastSignInAt: '',
        shortagesToday: 0,
        ordersSentToday: 0,
        shortagesTotal: 0,
        lastShortageAt: '',
      }
      teamUsers = [optimisticUser, ...teamUsers.filter((u) => u.id !== result.userId)]
      writePendingSettingsUsers([optimisticUser, ...readPendingSettingsUsers().filter((u) => u.id !== result.userId)])
      refreshUI()
      try {
        const loadedUsers = await loadTeamUsers()
        if (loadedUsers.length > 0) {
          const alreadyIncluded = loadedUsers.some((u) => u.id === result.userId)
          teamUsers = alreadyIncluded ? loadedUsers : [optimisticUser, ...loadedUsers]
        } else {
          teamUsers = [optimisticUser, ...teamUsers.filter((u) => u.id !== result.userId)]
        }
      } catch {
        teamUsers = [optimisticUser, ...teamUsers.filter((u) => u.id !== result.userId)]
      }
      refreshUI()
      showToast('Përdoruesi u shtua me sukses.')
    })
  }

  function refreshUI(): void {
    const tableBody = document.getElementById('owner-shortage-body')
    const ordersList = document.getElementById('owner-orders-list')
    const productsList = document.getElementById('owner-products-list')
    const importPreview = document.getElementById('owner-import-preview')
    const profilePanel = document.getElementById('owner-profile-panel')
    const settingsPanel = document.getElementById('owner-settings-panel')
    const dashboardPanel = document.getElementById('owner-dashboard-panel')
    const teamPanel = document.getElementById('owner-team-panel')
    const companyPanel = document.getElementById('owner-company-panel')
    if (tableBody) tableBody.innerHTML = renderShortagesBody()
    if (ordersList) ordersList.innerHTML = renderOrdersPanel()
    if (importPreview) importPreview.innerHTML = renderImportPreview()
    if (dashboardPanel) dashboardPanel.innerHTML = renderDashboardPanel()
    if (teamPanel) teamPanel.innerHTML = renderTeamPanel()
    if (companyPanel) companyPanel.innerHTML = renderCompanyPanel()
    if (profilePanel) {
      profilePanel.innerHTML = renderProfilePanel()
      bindProfileFormHandler()
    }
    if (settingsPanel) {
      settingsPanel.innerHTML = renderSettingsPanel()
      bindSettingsFormHandler()
    }
    if (productsList) {
      const productRows = getFilteredProducts()
      const duplicateNameCount = new Map<string, number>()
      products.forEach((p) => {
        const key = normalizeProductNameKey(p.name)
        duplicateNameCount.set(key, (duplicateNameCount.get(key) ?? 0) + 1)
      })
      productsList.innerHTML = productRows
        .slice(0, 40)
        .map(
          (p) => {
            const key = normalizeProductNameKey(p.name)
            const hasMultipleSuppliers = (duplicateNameCount.get(key) ?? 0) > 1
            const isPreferred = preferredProductByName[key] === p.id
            return (
            `<li class="flex items-start justify-between gap-2 border-b border-slate-200 py-2 text-xs">
              <div class="min-w-0">
                <p class="font-medium text-slate-700 truncate">${p.name}</p>
                <p class="text-slate-500">
                  ${p.supplierName} • ${p.category === 'front' ? 'Front' : 'Barna'} • ${
                  p.aliases.length ? p.aliases.join(', ') : 'pa emra alternativë'
                }
                </p>
                ${
                  hasMultipleSuppliers
                    ? `<div class="mt-1 inline-flex items-center gap-2">
                        <span class="rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          isPreferred ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                        }">${isPreferred ? 'Preferred supplier' : 'Alternative supplier'}</span>
                        <button data-action="set-preferred-product" data-product-id="${p.id}" class="text-[10px] font-semibold text-blue-700 hover:text-blue-900">
                          ${isPreferred ? 'Selected' : 'Choose this supplier'}
                        </button>
                      </div>`
                    : ''
                }
              </div>
              <div class="inline-flex items-center gap-1.5">
                <button data-action="edit-product" data-product-id="${p.id}" title="Ndrysho produktin" class="ui-icon-btn">${iconEdit}</button>
                <button data-action="delete-product" data-product-id="${p.id}" title="Fshi produktin" class="ui-icon-btn">${iconTrash}</button>
              </div>
            </li>`)
          }
        )
        .join('')
      const count = document.getElementById('owner-products-count')
      if (count) count.textContent = `${productRows.length}/${products.length}`
    }
    const suppliersList = document.getElementById('owner-suppliers-list')
    if (suppliersList) suppliersList.innerHTML = renderSuppliersList()
    const suppliersCount = document.getElementById('owner-suppliers-count')
    if (suppliersCount) suppliersCount.textContent = String(suppliers.length)
    const supplierOptions = document.getElementById('owner-supplier-options')
    if (supplierOptions) {
      supplierOptions.innerHTML = suppliers
        .map((s) => `<option value="${s.name}"></option>`)
        .join('')
    }
    const supplierSearchInput = document.getElementById('owner-suppliers-search') as HTMLInputElement | null
    if (supplierSearchInput && supplierSearchInput.value !== supplierQuery) supplierSearchInput.value = supplierQuery
    const countTop = document.getElementById('owner-products-count-top')
    if (countTop) countTop.textContent = `${products.length}`
    const statShortages = document.getElementById('owner-stat-shortages')
    const statOrders = document.getElementById('owner-stat-orders')
    const statUrgent = document.getElementById('owner-stat-urgent')
    const sortHint = document.getElementById('owner-sort-hint')
    if (statShortages) statShortages.textContent = String(shortages.length)
    if (statOrders)
      statOrders.textContent = String(
        section === 'mungesat' ? generatedOrders.length : showAllOrders ? allOrders.length : generatedOrders.length
      )
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
    const importManualPanel = document.getElementById('owner-import-manual-panel')
    const importFilePanel = document.getElementById('owner-import-file-panel')
    if (importManualPanel) importManualPanel.classList.toggle('hidden', importTab !== 'manual')
    if (importFilePanel) importFilePanel.classList.toggle('hidden', importTab !== 'file')
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
    const menuName = document.getElementById('owner-menu-name')
    const menuRole = document.getElementById('owner-menu-role')
    const menuTriggerName = document.getElementById('owner-menu-trigger-name')
    const menuTriggerRole = document.getElementById('owner-menu-trigger-role')
    const menuEmail = document.getElementById('owner-menu-email')
    const displayName = `${accountInfo.firstName} ${accountInfo.lastName}`.trim()
    if (sidebarAvatar) sidebarAvatar.textContent = (accountInfo.firstName || 'O').slice(0, 1).toUpperCase()
    if (menuAvatar) menuAvatar.textContent = (accountInfo.firstName || 'O').slice(0, 1).toUpperCase()
    if (menuName) menuName.textContent = displayName || 'Përdorues'
    if (menuRole) menuRole.textContent = accountInfo.role || '...'
    if (menuTriggerName) menuTriggerName.textContent = displayName || 'Përdorues'
    if (menuTriggerRole) menuTriggerRole.textContent = accountInfo.role || '...'
    if (menuEmail) menuEmail.textContent = accountInfo.email || '—'
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
          <p class="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">NAVIGIMI</p>
          <nav class="space-y-1 text-sm">
            <a href="#/pronari" class="${active('dashboard')}"><span class="premium-nav-dot"></span>Dashboard</a>
            <a href="#/pronari/mungesat" class="${active('mungesat')}"><span class="premium-nav-dot"></span>Mungesat</a>
            <a href="#/porosite" class="${active('porosite')}"><span class="premium-nav-dot"></span>Porositë</a>
            <a href="#/import" class="${active('import')}"><span class="premium-nav-dot"></span>Import</a>
            <p class="pt-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">KOMPANIA</p>
            <a href="#/kompania" class="${active('kompania')}"><span class="premium-nav-dot"></span>Detajet e Kompanisë</a>
            <a href="#/ekipa" class="${active('ekipa')}"><span class="premium-nav-dot"></span>Ekipa</a>
            ${canSeeSettings ? `<a href="#/settings" class="${active('settings')}"><span class="premium-nav-dot"></span>Settings</a>` : ''}
          </nav>
        </div>
        <div class="space-y-2">
          <div id="owner-sidebar-account-card" class="rounded-2xl border border-slate-200 bg-white/95 px-3 py-2.5 shadow-sm">
            <div class="flex items-center gap-3">
              <div id="owner-sidebar-avatar" class="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 text-sm font-semibold text-blue-700 ring-1 ring-blue-200/80">
              O
              </div>
              <div class="min-w-0 text-xs">
                <div id="owner-sidebar-name" class="truncate text-slate-900 font-semibold">Përdorues</div>
                <div id="owner-sidebar-role" class="truncate text-slate-500 text-[11px]">...</div>
              </div>
            </div>
            <div class="mt-2 flex items-center justify-between text-[10px]">
              <span class="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700">
                <span class="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                Online
              </span>
              <span class="text-slate-400">FlowInventory</span>
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
              <p class="text-sm font-semibold uppercase tracking-wide text-slate-600">${
                section === 'dashboard'
                  ? 'Dashboard'
                  : section === 'mungesat'
                    ? 'Mungesat'
                    : section === 'porosite'
                      ? 'Porositë'
                      : section === 'kompania'
                        ? 'Kompania'
                        : section === 'ekipa'
                          ? 'Ekipa'
                      : section === 'profile'
                        ? 'Profile'
                        : section === 'settings'
                          ? 'Settings'
                          : 'Import'
              }</p>
              ${
                section === 'mungesat' || section === 'dashboard'
                  ? ''
                  : `<h1 class="text-xl md:text-2xl font-semibold tracking-tight text-slate-900">${
                      section === 'porosite'
                        ? 'Porositë të ndara sipas furnitorit'
                        : section === 'kompania'
                          ? 'Detajet e kompanisë'
                          : section === 'ekipa'
                            ? 'Ekipa e kompanisë'
                        : section === 'profile'
                          ? 'Profili i llogarisë'
                          : section === 'settings'
                            ? 'Settings'
                        : 'Menaxho importin dhe produktet'
                    }</h1>`
              }
              </div>
            </div>
            <div class="w-full md:flex-1 md:flex md:justify-center">
              <div class="flex w-full max-w-2xl items-center gap-2">
                <div class="premium-top-search flex-1">
                  <span class="premium-top-search-icon">${iconSearch}</span>
                  <input
                    id="owner-top-search"
                    type="text"
                    placeholder="Search and jump (dashboard, mungesat, porosite, import, ekipa, kompania, settings)"
                    class="premium-top-search-input"
                    value="${searchQuery}"
                    list="owner-advanced-search-options"
                  />
                  <datalist id="owner-advanced-search-options">
                    <option value="dashboard"></option>
                    <option value="mungesat"></option>
                    <option value="porosite"></option>
                    <option value="import"></option>
                    <option value="ekipa"></option>
                    <option value="kompania"></option>
                    <option value="settings"></option>
                    <option value="profile"></option>
                  </datalist>
                </div>
              </div>
            </div>
            <div class="owner-header-controls flex w-full flex-col gap-2 md:w-auto md:flex-row md:items-center md:justify-end">
              <button type="button" id="btn-import-csv" class="hidden items-center gap-2 rounded-xl px-3 py-2 text-xs">
                Ngarko file (Excel/CSV)
              </button>
              <input id="import-csv-input" type="file" accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" class="hidden" />
              <button type="button" id="btn-generate-orders" class="${section === 'porosite' ? 'premium-btn-primary inline-flex' : 'hidden'} owner-generate-btn max-w-full flex-wrap items-center justify-center gap-2 rounded-xl px-3 py-2 text-[11px] font-semibold sm:px-4 sm:text-xs">
                Gjenero porositë sipas furnitorit
              </button>
              <div class="owner-header-actions flex items-center justify-end gap-2">
                <div id="owner-account-wrap" class="relative">
                  <button type="button" id="owner-account-menu-btn" class="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50">
                    <span class="min-w-0 text-left leading-tight">
                      <span id="owner-menu-trigger-name" class="block max-w-28 truncate text-[11px] font-semibold text-slate-800">Përdorues</span>
                      <span id="owner-menu-trigger-role" class="block max-w-28 truncate text-[10px] text-slate-500">...</span>
                    </span>
                    <span class="text-slate-400">▾</span>
                  </button>
                  <div id="owner-account-menu" class="hidden absolute right-0 top-full mt-2 w-56 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl z-120">
                    <div class="px-2.5 py-2 border-b border-slate-200">
                      <p id="owner-menu-name" class="truncate text-xs font-semibold text-slate-900">Përdorues</p>
                      <p id="owner-menu-role" class="text-[11px] text-slate-500">...</p>
                      <p id="owner-menu-email" class="truncate text-[11px] text-slate-500">—</p>
                    </div>
                    <button type="button" id="owner-account-profile" class="w-full text-left rounded-lg px-2.5 py-2 text-xs text-slate-700 hover:bg-slate-100">
                      Profile
                    </button>
                    ${canSeeSettings ? `<button type="button" id="owner-account-settings" class="w-full text-left rounded-lg px-2.5 py-2 text-xs text-slate-700 hover:bg-slate-100">Settings</button>` : ''}
                    <button type="button" data-theme-toggle="1" data-theme-fixed-label="Theme" class="owner-account-menu-item-theme mt-1 flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-xs text-slate-700 hover:bg-slate-100">
                      <span>Theme</span>
                    </button>
                    <button type="button" id="owner-account-logout" class="w-full text-left rounded-lg px-2.5 py-2 text-xs text-red-700 hover:bg-red-50">
                      ⎋ Dil nga account
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        <section class="${section === 'dashboard' ? '' : 'hidden '}relative z-0 mb-6 grid gap-3 md:grid-cols-4">
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
          <div id="owner-dashboard-panel" class="${section === 'dashboard' ? '' : 'hidden '}space-y-3">
            ${renderDashboardPanel()}
          </div>
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
            <form id="owner-shortage-add-form" class="mb-3 grid gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 md:grid-cols-[1fr_auto_1fr_auto]">
              <input id="owner-shortage-add-product" list="owner-shortage-product-options" type="text" placeholder="Shto mungesë: produkt — furnitor" class="premium-input w-full rounded-lg px-2.5 py-1.5 text-xs placeholder:text-slate-400 focus:outline-none" />
              <input id="owner-shortage-add-product-id" type="hidden" />
              <datalist id="owner-shortage-product-options">
                ${products
                  .slice()
                  .sort((a, b) => compareAlbanian(a.name, b.name))
                  .map((p) => `<option value="${p.name} — ${p.supplierName}"></option>`)
                  .join('')}
              </datalist>
              <label class="inline-flex items-center gap-1 text-xs text-slate-700 whitespace-nowrap">
                <input id="owner-shortage-add-urgent" type="checkbox" class="h-3.5 w-3.5 rounded border-slate-300 text-red-600 focus:ring-red-500" />
                Urgjent
              </label>
              <input id="owner-shortage-add-note" type="text" placeholder="Shënim (opsional)" class="premium-input w-full rounded-lg px-2.5 py-1.5 text-xs placeholder:text-slate-400 focus:outline-none" />
              <button type="submit" class="premium-btn-primary rounded-lg px-3 py-1.5 text-xs font-semibold">Shto mungesë</button>
            </form>
            <div id="owner-shortage-suggestions" class="mb-3"></div>
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
                <button data-action="show-all" class="${section === 'porosite' ? '' : 'hidden '}premium-btn-ghost rounded-lg px-2.5 py-1 text-[11px]">${
                  showAllOrders ? 'Shfaq vetëm të rejat' : 'Shiko të gjitha'
                }</button>
              </div>
              <div id="owner-orders-list" class="space-y-2">${renderOrdersPanel()}</div>
              <div class="${section === 'mungesat' ? '' : 'hidden '}mt-3">
                <button
                  type="button"
                  id="btn-generate-orders-today"
                  class="premium-btn-primary inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-[11px] font-semibold sm:px-4 sm:text-xs"
                >
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

                <div id="owner-import-manual-panel" class="${String(importTab) === 'manual' ? '' : 'hidden'}">
                  <form id="owner-product-form" class="grid gap-2 md:grid-cols-2">
                    <input id="owner-product-name" type="text" placeholder="Emri i barit (p.sh. Paracetamol 500mg)" class="premium-input w-full rounded-lg px-2.5 py-1.5 text-xs placeholder:text-slate-400 focus:outline-none md:col-span-2" />
                    <input id="owner-product-supplier" type="text" list="owner-supplier-options" placeholder="Furnitori (p.sh. TrePharm)" class="premium-input w-full rounded-lg px-2.5 py-1.5 text-xs placeholder:text-slate-400 focus:outline-none" />
                    <select id="owner-product-category" class="premium-input w-full rounded-lg px-2.5 py-1.5 text-xs focus:outline-none">
                      <option value="barna">Barna</option>
                      <option value="front">Front</option>
                    </select>
                    <input id="owner-product-aliases" type="text" placeholder="Emra alternativë (opsional), ndarë me presje" class="premium-input w-full rounded-lg px-2.5 py-1.5 text-xs placeholder:text-slate-400 focus:outline-none md:col-span-2" />
                    <datalist id="owner-supplier-options"></datalist>
                    <button type="submit" class="premium-btn-primary w-full rounded-lg px-3 py-1.5 text-xs font-semibold md:col-span-2">
                      Shto produkt
                    </button>
                  </form>
                </div>

                <div id="owner-import-file-panel" class="${String(importTab) === 'file' ? 'space-y-3' : 'hidden space-y-3'}">
                  <button type="button" data-action="open-import-picker" class="w-full rounded-xl border border-dashed border-blue-200 bg-blue-50/70 px-4 py-4 text-left hover:bg-blue-50">
                    <div class="text-xs font-semibold text-blue-800">Zgjidh file për import (Excel/CSV)</div>
                    <div class="mt-1 text-[11px] text-blue-700">Mbështetet: .csv, .xlsx, .xls</div>
                  </button>
                  <div id="owner-import-preview" class="mb-1"></div>
                </div>
              </div>

              <div class="premium-card p-4">
                <div class="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div class="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <h4 class="text-sm font-semibold text-slate-900">Suppliers</h4>
                    <span class="text-[11px] text-slate-500">Total: <span id="owner-suppliers-count">0</span></span>
                  </div>
                  <form id="owner-supplier-form" class="mb-2 flex flex-col gap-2 sm:flex-row">
                    <input id="owner-supplier-name" type="text" placeholder="Shto furnitor të ri" class="premium-input w-full rounded-lg px-2.5 py-1.5 text-xs placeholder:text-slate-400 focus:outline-none" />
                    <button type="submit" class="premium-btn-primary rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap">Add supplier</button>
                  </form>
                  <input id="owner-suppliers-search" type="text" placeholder="Kërko furnitor..." class="premium-input mb-2 w-full rounded-lg px-2.5 py-1.5 text-xs placeholder:text-slate-400 focus:outline-none" />
                  <ul id="owner-suppliers-list" class="max-h-44 space-y-1.5 overflow-auto pr-1"></ul>
                </div>
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
          <div id="owner-profile-panel" class="${section === 'profile' ? '' : 'hidden '}space-y-3">
            ${renderProfilePanel()}
          </div>
          <div id="owner-settings-panel" class="${section === 'settings' ? '' : 'hidden '}space-y-3">
            ${renderSettingsPanel()}
          </div>
          <div id="owner-company-panel" class="${section === 'kompania' ? '' : 'hidden '}space-y-3">
            ${renderCompanyPanel()}
          </div>
          <div id="owner-team-panel" class="${section === 'ekipa' ? '' : 'hidden '}space-y-3">
            ${renderTeamPanel()}
          </div>
        </section>
      </main>
    </div>
  `

  const accountMenuBtn = document.getElementById('owner-account-menu-btn') as HTMLButtonElement | null
  const accountMenu = document.getElementById('owner-account-menu') as HTMLDivElement | null
  const accountProfile = document.getElementById('owner-account-profile') as HTMLButtonElement | null
  const accountSettings = document.getElementById('owner-account-settings') as HTMLButtonElement | null
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
  accountProfile?.addEventListener('click', () => {
    accountMenu?.classList.add('hidden')
    window.location.hash = '#/profile'
  })
  accountSettings?.addEventListener('click', () => {
    accountMenu?.classList.add('hidden')
    window.location.hash = '#/settings'
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
  const supplierForm = document.getElementById('owner-supplier-form') as HTMLFormElement | null
  const supplierNameInput = document.getElementById('owner-supplier-name') as HTMLInputElement | null
  const supplierSearchInput = document.getElementById('owner-suppliers-search') as HTMLInputElement | null
  const ownerShortageAddForm = document.getElementById('owner-shortage-add-form') as HTMLFormElement | null
  const ownerShortageAddProductInput = document.getElementById('owner-shortage-add-product') as HTMLInputElement | null
  const ownerShortageAddProductIdInput = document.getElementById('owner-shortage-add-product-id') as HTMLInputElement | null
  const ownerShortageAddUrgentInput = document.getElementById('owner-shortage-add-urgent') as HTMLInputElement | null
  const ownerShortageAddNoteInput = document.getElementById('owner-shortage-add-note') as HTMLInputElement | null
  const ownerShortageSuggestions = document.getElementById('owner-shortage-suggestions') as HTMLDivElement | null
  const importInput = document.getElementById('import-csv-input') as HTMLInputElement | null
  const productSearchInput = document.getElementById('owner-products-search') as HTMLInputElement | null
  const productSortSelect = document.getElementById('owner-products-sort') as HTMLSelectElement | null
  bindProfileFormHandler()
  bindSettingsFormHandler()

  const applySearch = (value: string): void => {
    searchQuery = value
    if (searchInput && searchInput.value !== value) searchInput.value = value
    if (topSearchInput && topSearchInput.value !== value) topSearchInput.value = value
    refreshUI()
  }

  const normalizeForSearch = (value: string): string =>
    value
      .toLocaleLowerCase('sq-AL')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()

  const navigateHash = (hash: string): void => {
    if (window.location.hash !== hash) {
      window.location.hash = hash
    } else {
      refreshUI()
    }
  }

  const runAdvancedSearch = (rawValue: string): void => {
    const query = rawValue.trim()
    if (!query) return
    const q = normalizeForSearch(query)
    applySearch(query)

    const routeMatches: Array<{ keys: string[]; hash: string }> = [
      { keys: ['dashboard', 'home'], hash: '#/pronari' },
      { keys: ['mungesat', 'mungesa', 'shortage'], hash: '#/pronari/mungesat' },
      { keys: ['porosite', 'porosi', 'orders'], hash: '#/porosite' },
      { keys: ['import', 'excel', 'csv'], hash: '#/import' },
      { keys: ['ekipa', 'team', 'users'], hash: '#/ekipa' },
      { keys: ['kompania', 'company'], hash: '#/kompania' },
      { keys: ['settings', 'konfigurim', 'config'], hash: '#/settings' },
      { keys: ['profile', 'profili', 'account'], hash: '#/profile' },
    ]
    const route = routeMatches.find((m) => m.keys.some((k) => q === k || q.includes(k) || k.includes(q)))
    if (route) {
      navigateHash(route.hash)
      return
    }

    const hasProduct = products.some((p) => normalizeForSearch(`${p.name} ${p.supplierName} ${(p.aliases || []).join(' ')}`).includes(q))
    const hasOrder = allOrders.some((o) => normalizeForSearch(`${o.id} ${o.supplier}`).includes(q))
    if (hasOrder) {
      navigateHash('#/porosite')
      return
    }
    if (hasProduct) {
      navigateHash('#/pronari/mungesat')
      return
    }
    navigateHash('#/pronari/mungesat')
  }

  searchInput?.addEventListener('input', () => applySearch(searchInput.value))
  topSearchInput?.addEventListener('input', () => applySearch(topSearchInput.value))
  topSearchInput?.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return
    event.preventDefault()
    runAdvancedSearch(topSearchInput.value)
  })

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
  supplierSearchInput?.addEventListener('input', () => {
    supplierQuery = supplierSearchInput.value
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
    suppliers = await getSuppliers()
    preferredProductByName = await getPreferredProductByName()
    productForm.reset()
    if (productCategoryInput) productCategoryInput.value = 'barna'
    refreshUI()
    showToast('Bari u shtua. Do të dalë edhe te punëtori.')
  })

  supplierForm?.addEventListener('submit', async (event) => {
    event.preventDefault()
    const supplierName = (supplierNameInput?.value ?? '').trim()
    if (!supplierName) {
      showToast('Shkruaj emrin e furnitorit.')
      return
    }
    const result = await addSupplier(supplierName)
    if (!result.ok) {
      showToast(result.message)
      return
    }
    suppliers = await getSuppliers()
    if (supplierNameInput) supplierNameInput.value = ''
    refreshUI()
    showToast('Furnitori u shtua.')
  })

  ownerShortageAddForm?.addEventListener('submit', async (event) => {
    event.preventDefault()
    const raw = (ownerShortageAddProductInput?.value ?? '').trim()
    if (!raw) {
      showToast('Shkruaj produktin.')
      return
    }
    const normalized = raw.toLocaleLowerCase('sq-AL')
    const selectedFromHiddenId =
      ownerShortageAddProductIdInput?.value?.trim()
        ? products.find((p) => p.id === ownerShortageAddProductIdInput.value.trim())
        : undefined
    const selectedProduct =
      selectedFromHiddenId ??
      products.find((p) => `${p.name} — ${p.supplierName}`.toLocaleLowerCase('sq-AL') === normalized) ??
      products.find((p) => `${p.name} - ${p.supplierName}`.toLocaleLowerCase('sq-AL') === normalized) ??
      (() => {
        const ranked = rankProductsForWorkerSearch(products, raw, 8)
        return ranked.length === 1 ? ranked[0] : undefined
      })()
    if (!selectedProduct) {
      showToast('Zgjidh një produkt nga sugjerimet.')
      return
    }
    try {
      await addMungese(
        selectedProduct.id,
        Boolean(ownerShortageAddUrgentInput?.checked),
        (ownerShortageAddNoteInput?.value ?? '').trim()
      )
      shortages = applySuggestedQtyDraft(await getTodayShortages())
      ownerShortageAddForm.reset()
      if (ownerShortageAddProductIdInput) ownerShortageAddProductIdInput.value = ''
      if (ownerShortageSuggestions) ownerShortageSuggestions.innerHTML = ''
      refreshUI()
      showToast('Mungesa u shtua.')
    } catch {
      showToast('Shtimi i mungesës dështoi.')
    }
  })

  ownerShortageAddProductInput?.addEventListener('input', () => {
    if (ownerShortageAddProductIdInput) ownerShortageAddProductIdInput.value = ''
    const query = ownerShortageAddProductInput.value
    if (ownerShortageSuggestions) ownerShortageSuggestions.innerHTML = renderOwnerShortageSuggestions(query)
  })

  ownerShortageAddProductInput?.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return
    const ranked = rankProductsForWorkerSearch(products, ownerShortageAddProductInput.value.trim(), 8)
    if (ranked.length === 1) {
      event.preventDefault()
      ownerShortageAddProductInput.value = `${ranked[0].name} — ${ranked[0].supplierName}`
      if (ownerShortageAddProductIdInput) ownerShortageAddProductIdInput.value = ranked[0].id
      ownerShortageAddForm?.requestSubmit()
      return
    }
    if (ranked.length > 1) {
      event.preventDefault()
      showToast('Ka disa rezultate. Zgjidh njërin nga sugjerimet.')
    }
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
    const userId = btn.dataset.userId?.trim()

    if (action === 'dashboard-range') {
      const nextDays = Number(btn.dataset.days)
      if (nextDays === 7 || nextDays === 14 || nextDays === 30) {
        dashboardRangeDays = nextDays
        void reloadDashboardInsights()
      }
      return
    }

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

    if (action === 'go-profile') {
      window.location.hash = '#/profile'
      return
    }

    if (action === 'go-company') {
      window.location.hash = '#/kompania'
      return
    }

    if (action === 'sign-out-owner') {
      signOut()
      return
    }

    if (action === 'refresh-owner-data') {
      teamLoading = true
      teamLoadError = ''
      refreshUI()
      try {
        const [rows, productRows, recentOrders, dashboardData, companyData, supplierRows, preferredMap] =
          await Promise.all([
            getTodayShortages(),
            getProducts(),
            getRecentOrders(),
            getDashboardInsights(dashboardRangeDays),
            getCompanyDetails(),
            getSuppliers(),
            getPreferredProductByName(),
          ])
        shortages = applySuggestedQtyDraft(rows)
        products = productRows
        allOrders = recentOrders
        dashboardInsights = dashboardData
        const cachedCompanyDetails = readCompanyDetailsCache()
        companyDetails = mergeCompanyDetails(companyData, cachedCompanyDetails)
        writeCompanyDetailsCache(companyDetails)
        suppliers = supplierRows
        preferredProductByName = preferredMap
        try {
          teamUsers = await loadTeamUsers()
        } catch (err) {
          teamLoadError = err instanceof Error ? err.message : 'Nuk u ngarkua ekipa.'
        } finally {
          teamLoading = false
        }
        refreshUI()
        showToast('Të dhënat u rifreskuan.')
      } catch (err) {
        teamLoading = false
        refreshUI()
        showToast(err instanceof Error ? err.message : 'Rifreskimi dështoi. Provo përsëri.')
      }
      return
    }

    if (action === 'edit-user-row' && userId) {
      if (!canSeeSettings) {
        showToast('Vetëm OWNER mund të menaxhojë përdoruesit.')
        return
      }
      const rowId = btn.dataset.rowId?.trim()
      const saveBtnId = btn.dataset.saveBtnId?.trim()
      const cancelBtnId = btn.dataset.cancelBtnId?.trim()
      if (!rowId) return
      const row = document.querySelector<HTMLElement>(`[data-settings-row="${rowId}"]`)
      if (!row) return
      row.querySelectorAll<HTMLInputElement | HTMLSelectElement>('[data-edit-target="1"]').forEach((el) => {
        el.disabled = false
      })
      if (saveBtnId) {
        const saveBtn = document.getElementById(saveBtnId) as HTMLButtonElement | null
        if (saveBtn) saveBtn.disabled = false
      }
      if (cancelBtnId) {
        const cancelBtn = document.getElementById(cancelBtnId) as HTMLButtonElement | null
        if (cancelBtn) cancelBtn.disabled = false
      }
      btn.disabled = true
      btn.textContent = 'Duke edituar'
      return
    }

    if (action === 'cancel-user-row') {
      refreshUI()
      return
    }

    if (action === 'save-user-row' && userId) {
      if (!canSeeSettings) {
        showToast('Vetëm OWNER mund të menaxhojë përdoruesit.')
        return
      }
      const usernameInputId = btn.dataset.usernameInputId?.trim()
      const roleSelectId = btn.dataset.roleSelectId?.trim()
      const activeInputId = btn.dataset.activeInputId?.trim()
      const usernameInput = usernameInputId
        ? (document.getElementById(usernameInputId) as HTMLInputElement | null)
        : null
      const roleSelect = roleSelectId
        ? (document.getElementById(roleSelectId) as HTMLSelectElement | null)
        : null
      const activeInput = activeInputId
        ? (document.getElementById(activeInputId) as HTMLInputElement | null)
        : null
      const username = (usernameInput?.value ?? '').trim().toLocaleLowerCase('sq-AL')
      const roleRaw = String(roleSelect?.value ?? 'WORKER').toUpperCase()
      const nextRole = roleRaw === 'OWNER' ? 'OWNER' : roleRaw === 'MANAGER' ? 'MANAGER' : 'WORKER'
      const nextActive = Boolean(activeInput?.checked)
      if (username.length < 3 || username.length > 32) {
        showToast('Username duhet të ketë 3-32 karaktere.')
        return
      }
      if (!/^[a-z0-9._-]+$/.test(username)) {
        showToast('Username lejon vetëm a-z, 0-9, ., _, -.')
        return
      }
      if (!isUuid(userId)) {
        const resolvedId = await resolveRealUserId(username)
        if (resolvedId) {
          const usernameRes = await adminUpdateUsername(resolvedId, username)
          if (!usernameRes.ok) {
            showToast(usernameRes.message)
            return
          }
          const roleRes = await adminUpdateUserRole(resolvedId, nextRole)
          if (!roleRes.ok) {
            showToast(roleRes.message)
            return
          }
          const activeRes = await adminSetUserActive(resolvedId, nextActive)
          if (!activeRes.ok) {
            showToast(activeRes.message)
            return
          }
          teamUsers = await loadTeamUsers()
          refreshUI()
          showToast('Rreshti pending u sinkronizua me databazën.')
          return
        }
        teamUsers = teamUsers.map((u) =>
          u.id === userId ? { ...u, username, role: nextRole, isActive: nextActive } : u
        )
        writePendingSettingsUsers(
          readPendingSettingsUsers().map((u) =>
            u.id === userId ? { ...u, username, role: nextRole, isActive: nextActive } : u
          )
        )
        refreshUI()
        showToast('Rreshti pending u përditësua lokalisht (ende pa UUID nga databaza).')
        return
      }
      const usernameRes = await adminUpdateUsername(userId, username)
      if (!usernameRes.ok) {
        showToast(usernameRes.message)
        return
      }
      const roleRes = await adminUpdateUserRole(userId, nextRole)
      if (!roleRes.ok) {
        showToast(roleRes.message)
        return
      }
      const activeRes = await adminSetUserActive(userId, nextActive)
      if (!activeRes.ok) {
        showToast(activeRes.message)
        return
      }
      teamUsers = await loadTeamUsers()
      refreshUI()
      showToast('Përdoruesi u përditësua.')
      return
    }

    if (action === 'save-user-profile' && userId) {
      if (!canSeeSettings) {
        showToast('Vetëm OWNER mund të menaxhojë përdoruesit.')
        return
      }
      const usernameInputId = btn.dataset.usernameInputId?.trim()
      const usernameInput = usernameInputId
        ? (document.getElementById(usernameInputId) as HTMLInputElement | null)
        : null
      const username = (usernameInput?.value ?? '').trim().toLocaleLowerCase('sq-AL')
      if (username.length < 3 || username.length > 32) {
        showToast('Username duhet të ketë 3-32 karaktere.')
        return
      }
      if (!/^[a-z0-9._-]+$/.test(username)) {
        showToast('Username lejon vetëm a-z, 0-9, ., _, -.')
        return
      }
      const result = await adminUpdateUsername(userId, username)
      if (!result.ok) {
        showToast(result.message)
        return
      }
      teamUsers = await loadTeamUsers()
      refreshUI()
      showToast('Profili i përdoruesit u ruajt.')
      return
    }

    if (action === 'set-user-role' && userId) {
      if (!canSeeSettings) {
        showToast('Vetëm OWNER mund të menaxhojë përdoruesit.')
        return
      }
      const nextRole = btn.dataset.role === 'MANAGER' ? 'MANAGER' : 'WORKER'
      const result = await adminUpdateUserRole(userId, nextRole)
      if (!result.ok) {
        showToast(result.message)
        return
      }
      teamUsers = await loadTeamUsers()
      refreshUI()
      showToast(`Roli u ndryshua në ${nextRole}.`)
      return
    }

    if (action === 'set-user-active' && userId) {
      if (!canSeeSettings) {
        showToast('Vetëm OWNER mund të menaxhojë përdoruesit.')
        return
      }
      const makeActive = btn.dataset.active === '1'
      const result = await adminSetUserActive(userId, makeActive)
      if (!result.ok) {
        showToast(result.message)
        return
      }
      teamUsers = await loadTeamUsers()
      refreshUI()
      showToast(makeActive ? 'Përdoruesi u aktivizua.' : 'Përdoruesi u çaktivizua.')
      return
    }

    if (action === 'delete-user' && userId) {
      if (!canSeeSettings) {
        showToast('Vetëm OWNER mund të menaxhojë përdoruesit.')
        return
      }
      const userRow = teamUsers.find((u) => u.id === userId)
      if (!userRow) return
      const yes = await openConfirmModal(
        'Fshirja e përdoruesit',
        `A je i sigurt që do ta fshish përdoruesin "${userRow.username || userRow.email}"?`
      )
      if (!yes) return
      if (!isUuid(userId)) {
        const resolvedId = await resolveRealUserId(userRow.username || '')
        if (resolvedId) {
          const result = await adminDeleteUser(resolvedId)
          if (!result.ok) {
            const deactivate = await adminSetUserActive(resolvedId, false)
            if (!deactivate.ok) {
              showToast(result.message)
              return
            }
            teamUsers = await loadTeamUsers()
            refreshUI()
            showToast('Delete RPC dështoi; përdoruesi u çaktivizua.')
            return
          }
          teamUsers = await loadTeamUsers()
          refreshUI()
          showToast('Përdoruesi u fshi.')
          return
        }
        teamUsers = teamUsers.filter((u) => u.id !== userId)
        writePendingSettingsUsers(readPendingSettingsUsers().filter((u) => u.id !== userId))
        refreshUI()
        showToast('Rreshti pending u fshi lokalisht (ende pa UUID nga databaza).')
        return
      }
      const result = await adminDeleteUser(userId)
      if (!result.ok) {
        const deactivate = await adminSetUserActive(userId, false)
        if (!deactivate.ok) {
          showToast(result.message)
          return
        }
        teamUsers = await loadTeamUsers()
        refreshUI()
        showToast('Delete RPC dështoi; përdoruesi u çaktivizua.')
        return
      }
      teamUsers = await loadTeamUsers()
      refreshUI()
      showToast('Përdoruesi u fshi.')
      return
    }

    if (action === 'save-company-details') {
      if (!canSeeSettings) {
        showToast('Vetëm OWNER mund të ruajë të dhënat e kompanisë.')
        return
      }
      const nextDetails: CompanyDetails = {
        name:
          (document.getElementById('owner-company-name') as HTMLInputElement | null)?.value?.trim() ?? '',
        posName:
          (document.getElementById('owner-company-pos-name') as HTMLInputElement | null)?.value?.trim() ?? '',
        phone: (document.getElementById('owner-company-phone') as HTMLInputElement | null)?.value?.trim() ?? '',
        email: (document.getElementById('owner-company-email') as HTMLInputElement | null)?.value?.trim() ?? '',
        address:
          (document.getElementById('owner-company-address') as HTMLInputElement | null)?.value?.trim() ?? '',
        logoUrl:
          (document.getElementById('owner-company-logo-url') as HTMLInputElement | null)?.value?.trim() ?? '',
        otherInfo:
          (document.getElementById('owner-company-other-info') as HTMLTextAreaElement | null)?.value?.trim() ?? '',
      }
      writeCompanyDetailsCache(nextDetails)
      const result = await updateCompanyDetails(nextDetails)
      if (!result.ok) {
        showToast(result.message)
        return
      }
      const savedFromDb = await getCompanyDetails()
      companyDetails = mergeCompanyDetails(savedFromDb, nextDetails)
      writeCompanyDetailsCache(companyDetails)
      refreshUI()
      showToast('Të dhënat e kompanisë u ruajtën.')
      return
    }

    if (action === 'set-preferred-product' && productId) {
      const current = products.find((p) => p.id === productId)
      if (!current) return
      const result = await setPreferredProductByName(current.name, current.id, current.supplierId)
      if (!result.ok) {
        showToast(result.message)
        return
      }
      preferredProductByName = await getPreferredProductByName()
      refreshUI()
      showToast(`U zgjodh furnitori preferuar për "${current.name}".`)
      return
    }

    if (action === 'rename-supplier') {
      const supplierId = String(btn.dataset.supplierId ?? '').trim()
      if (!supplierId) return
      const current = suppliers.find((s) => s.id === supplierId)
      if (!current) return
      const nextName = window.prompt('Emri i ri i furnitorit', current.name)?.trim()
      if (!nextName || nextName === current.name) return
      const result = await renameSupplier(supplierId, nextName)
      if (!result.ok) {
        showToast(result.message)
        return
      }
      suppliers = await getSuppliers()
      products = await getProducts()
      refreshUI()
      showToast('Furnitori u përditësua.')
      return
    }

    if (action === 'delete-supplier') {
      const supplierId = String(btn.dataset.supplierId ?? '').trim()
      if (!supplierId) return
      const current = suppliers.find((s) => s.id === supplierId)
      if (!current) return
      const yes = await openConfirmModal(
        'Fshirja e furnitorit',
        `A je i sigurt që do ta fshish furnitorin "${current.name}"?`
      )
      if (!yes) return
      const result = await deleteSupplier(supplierId)
      if (!result.ok) {
        showToast(result.message)
        return
      }
      suppliers = await getSuppliers()
      refreshUI()
      showToast('Furnitori u fshi.')
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

    if (action === 'select-owner-shortage-product' && productId) {
      const selected = products.find((p) => p.id === productId)
      if (!selected) return
      if (ownerShortageAddProductInput) {
        ownerShortageAddProductInput.value = `${selected.name} — ${selected.supplierName}`
      }
      if (ownerShortageAddProductIdInput) ownerShortageAddProductIdInput.value = selected.id
      if (ownerShortageSuggestions) ownerShortageSuggestions.innerHTML = ''
      return
    }

    if (action === 'reassign-supplier' && id) {
      const current = shortages.find((s) => s.id === id)
      if (!current) return
      const nextProductId = await openSupplierReassignModal(current)
      if (!nextProductId || nextProductId === current.productId) return
      try {
        shortages = applySuggestedQtyDraft(await reassignShortageProduct(id, nextProductId))
        persistSuggestedQtyDraft(shortages)
        refreshUI()
        showToast('Furnitori i mungesës u ndryshua.')
      } catch {
        showToast('Ndryshimi i furnitorit dështoi.')
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
      suppliers = await getSuppliers()
      preferredProductByName = await getPreferredProductByName()
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
      suppliers = await getSuppliers()
      preferredProductByName = await getPreferredProductByName()
      refreshUI()
      showToast('Produkti u fshi.')
      return
    }

    if (action === 'show-all') {
      if (section !== 'porosite') return
      showAllOrders = !showAllOrders
      if (showAllOrders) {
        allOrders = await getRecentOrders(100)
      }
      refreshUI()
      showToast(
        showAllOrders
          ? `Po shfaqen të gjitha porositë (${allOrders.length}).`
          : `Po shfaqen vetëm porositë e gjeneruara tani (${generatedOrders.length}).`
      )
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
      suppliers = await getSuppliers()
      preferredProductByName = await getPreferredProductByName()
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

  const runGenerateOrders = async (): Promise<void> => {
    generatedOrders = await generateOrdersFromShortages(getFilteredRows())
    allOrders = await getRecentOrders(100)
    showAllOrders = false
    clearSuggestedQtyDraft()
    refreshUI()
    showToast('Porositë u gjeneruan sipas furnitorit.')
    document.getElementById('owner-orders-panel')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }
  const generateBtn = document.getElementById('btn-generate-orders') as HTMLButtonElement | null
  const generateTodayBtn = document.getElementById('btn-generate-orders-today') as HTMLButtonElement | null
  generateBtn?.addEventListener('click', () => {
    void runGenerateOrders()
  })
  generateTodayBtn?.addEventListener('click', () => {
    void runGenerateOrders()
  })

  teamLoading = canSeeSettings
  Promise.allSettled([
    getTodayShortages(),
    getProducts(),
    loadAccountInfo(),
    getRecentOrders(),
    getDashboardInsights(dashboardRangeDays).catch(() => buildEmptyDashboardInsights(dashboardRangeDays)),
    getCompanyDetails(),
    getSuppliers(),
    getPreferredProductByName(),
  ]).then(async (results) => {
    const valueAt = <T,>(idx: number, fallback: T): T => {
      const r = results[idx]
      return r.status === 'fulfilled' ? (r.value as T) : fallback
    }
    const rows = valueAt(0, [] as ShortageView[])
    const productRows = valueAt(1, [] as ProductView[])
    const recentOrders = valueAt(3, [] as OwnerOrder[])
    const dashboardData = valueAt(4, buildEmptyDashboardInsights(dashboardRangeDays))
    const companyData = valueAt(5, emptyCompanyDetails())
    const supplierRows = valueAt(6, [] as SupplierView[])
    const preferredMap = valueAt(7, {} as Record<string, string>)

    shortages = applySuggestedQtyDraft(rows)
    products = productRows
    suppliers = supplierRows
    preferredProductByName = preferredMap
    allOrders = recentOrders
    dashboardInsights = dashboardData
    const cachedCompanyDetails = readCompanyDetailsCache()
    companyDetails = mergeCompanyDetails(companyData, cachedCompanyDetails)
    writeCompanyDetailsCache(companyDetails)
    generatedOrders = []
    showAllOrders = false
    if (canSeeSettings) {
      try {
        teamUsers = await loadTeamUsers()
        teamLoadError = ''
      } catch (err) {
        teamLoadError = err instanceof Error ? err.message : 'Nuk u ngarkua ekipa.'
      } finally {
        teamLoading = false
      }
    }
    refreshUI()
  })

  if (isSupabaseConfigured) {
    const channel = supabase
      .channel(`owner-shortages-${Date.now()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'mungesat' },
        () => {
          void reloadShortages()
          void reloadDashboardInsights()
        }
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
