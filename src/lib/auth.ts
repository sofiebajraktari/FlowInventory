import { supabase, isSupabaseConfigured } from './supabase.js'
import type { Profile, UserRole } from '../types.js'
import { getMockUser, setMockUser } from '../types.js'

const OAUTH_PENDING_ROLE_KEY = 'flowinventory_oauth_pending_role'
const PASSWORD_RECOVERY_KEY = 'flowinventory_password_recovery_pending'

function requireSupabase(): void {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase nuk është konfiguruar. Shto VITE_SUPABASE_URL dhe VITE_SUPABASE_ANON_KEY.')
  }
}

function normalizeRole(value: unknown): UserRole | null {
  if (typeof value !== 'string') return null
  const role = value.toUpperCase()
  if (role === 'OWNER' || role === 'MANAGER' || role === 'WORKER') return role
  return null
}

function isLikelyEmail(value: string): boolean {
  return value.includes('@')
}

function isLookupRpcMissing(error: unknown): boolean {
  const code = typeof error === 'object' && error && 'code' in error ? String((error as any).code ?? '') : ''
  const msg = typeof error === 'object' && error && 'message' in error ? String((error as any).message ?? '') : ''
  const lower = msg.toLowerCase()
  return code === 'PGRST202' || lower.includes('lookup_login_email') || lower.includes('could not find the function')
}

async function resolveLoginEmail(identifier: string): Promise<string> {
  const normalized = identifier.trim().toLocaleLowerCase('sq-AL')
  if (!normalized) throw new Error('Shkruaj email ose username.')
  if (isLikelyEmail(normalized)) return normalized

  const lookup = await supabase.rpc('lookup_login_email', { p_identifier: normalized })
  if (!lookup.error) {
    const email = String(lookup.data ?? '').trim().toLocaleLowerCase('sq-AL')
    if (email) return email
    throw new Error('Ky username nuk u gjet.')
  }

  if (isLookupRpcMissing(lookup.error)) {
    throw new Error(
      "Login me username nuk është aktiv në databazë. Ekzekuto migrimin që krijon RPC 'lookup_login_email'."
    )
  }

  throw new Error(lookup.error.message || 'Kyçja dështoi.')
}

async function ensureProfileAfterLogin(): Promise<Profile | null> {
  const profile = await getProfile()
  if (profile) return profile

  const { data: userData } = await supabase.auth.getUser()
  const user = userData.user
  if (!user) return null

  const metadataRole = normalizeRole(user.user_metadata?.role)
  if (!metadataRole) return null

  const { error } = await supabase.from('profiles').insert({ id: user.id, role: metadataRole })
  if (error) return null
  return { role: metadataRole }
}

export async function getProfile(): Promise<Profile | null> {
  if (!isSupabaseConfigured) return null
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data, error } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (error || !data) return null
  const role = normalizeRole((data as { role?: unknown }).role)
  return role ? { role } : null
}

export function redirectByRole(role: UserRole): void {
  if (role === 'WORKER') window.location.hash = '#/mungesat'
  else if (role === 'OWNER' || role === 'MANAGER') window.location.hash = '#/pronari'
  else window.location.hash = '#/kycu'
}

export async function signIn(identifier: string, password: string): Promise<Profile> {
  requireSupabase()
  const loginEmail = await resolveLoginEmail(identifier)

  const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password })
  if (error) {
    const lower = String(error.message ?? '').toLowerCase()
    if (lower.includes('email not confirmed')) throw new Error('Verifiko emailin para kyçjes.')
    if (lower.includes('rate limit')) throw new Error('Shumë tentativa. Prit pak dhe provo përsëri.')
    if (lower.includes('database error querying schema')) {
      throw new Error('Useri është krijuar me skemë jo të plotë në Supabase Auth. Ekzekuto migrimin e fundit SQL dhe provo përsëri.')
    }
    if (lower.includes('invalid login credentials')) throw new Error('Email/username ose fjalëkalim i pasaktë.')
    throw new Error(error.message || 'Kyçja dështoi.')
  }

  const profile = await ensureProfileAfterLogin()
  if (!profile) throw new Error('Profili i përdoruesit mungon.')
  return profile
}

export async function signInWithGoogle(role: UserRole): Promise<void> {
  requireSupabase()
  if (role !== 'OWNER' && role !== 'WORKER') throw new Error('Zgjidh rolin para hyrjes me Google.')
  localStorage.setItem(OAUTH_PENDING_ROLE_KEY, role)
  const redirectTo = `${window.location.origin}/#/kycu`
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      queryParams: { prompt: 'select_account' },
    },
  })
  if (error) throw error
}

export async function signUp(
  email: string,
  password: string,
  role: UserRole,
  firstName: string,
  lastName: string
): Promise<{ role: UserRole; emailConfirmationRequired: boolean }> {
  if (!role || (role !== 'OWNER' && role !== 'WORKER')) throw new Error('Zgjidhni rol: Pronari ose Punëtori.')
  if (!firstName.trim() || !lastName.trim()) throw new Error('Emri dhe mbiemri janë të detyrueshëm.')
  requireSupabase()
  const { data, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        role,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
      },
    },
  })
  if (authError) throw authError
  const user = data.user
  if (!user) throw new Error('Regjistrimi dështoi.')
  return { role, emailConfirmationRequired: !data.session }
}

export async function signOut(): Promise<void> {
  if (isSupabaseConfigured) await supabase.auth.signOut()
  setMockUser(null)
  window.location.hash = '#/kycu'
}

export async function requestPasswordReset(email: string): Promise<void> {
  requireSupabase()
  const redirectTo = `${window.location.origin}/`
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
  if (error) throw error
}

export async function completePasswordRecovery(newPassword: string): Promise<void> {
  requireSupabase()
  if (!newPassword || newPassword.length < 6) {
    throw new Error('Fjalëkalimi duhet të ketë të paktën 6 karaktere.')
  }
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) throw error
  clearPasswordRecoveryPending()
}

export async function updateMyProfileName(firstName: string, lastName: string): Promise<void> {
  const nextFirst = firstName.trim()
  const nextLast = lastName.trim()
  if (!nextFirst || !nextLast) throw new Error('Emri dhe mbiemri janë të detyrueshëm.')
  if (!isSupabaseConfigured) {
    const current = getMockUser()
    if (current) {
      setMockUser({ ...current, firstName: nextFirst, lastName: nextLast })
    }
    return
  }
  const { error } = await supabase.auth.updateUser({
    data: {
      first_name: nextFirst,
      last_name: nextLast,
    },
  })
  if (error) throw error
}

export function isPasswordRecoveryPending(): boolean {
  try {
    return sessionStorage.getItem(PASSWORD_RECOVERY_KEY) === '1'
  } catch {
    return false
  }
}

export function setPasswordRecoveryPending(): void {
  try {
    sessionStorage.setItem(PASSWORD_RECOVERY_KEY, '1')
  } catch {
  }
}

export function clearPasswordRecoveryPending(): void {
  try {
    sessionStorage.removeItem(PASSWORD_RECOVERY_KEY)
  } catch {
  }
}

export function syncPasswordRecoveryFromUrl(): void {
  const href = window.location.href.toLowerCase()
  if (href.includes('type=recovery')) setPasswordRecoveryPending()
}

export async function finalizeOAuthProfileIfNeeded(): Promise<Profile | null> {
  requireSupabase()
  const profile = await getProfile()
  if (profile) return profile

  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData.user) return null

  const pendingRole = normalizeRole(localStorage.getItem(OAUTH_PENDING_ROLE_KEY))
  if (!pendingRole) return null

  const { error } = await supabase.from('profiles').upsert({ id: userData.user.id, role: pendingRole })
  if (error) return null

  localStorage.removeItem(OAUTH_PENDING_ROLE_KEY)
  return { role: pendingRole }
}

export function hasSession(): Promise<boolean> {
  if (!isSupabaseConfigured) return Promise.resolve(false)
  return supabase.auth
    .getUser()
    .then(({ data, error }) => Boolean(!error && data.user))
    .catch(() => false)
}
