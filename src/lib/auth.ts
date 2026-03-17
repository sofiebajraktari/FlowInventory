import { supabase, isSupabaseConfigured } from './supabase.js'
import type { Profile, UserRole } from '../types.js'
import { setMockUser } from '../types.js'

function requireSupabase(): void {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase nuk është konfiguruar. Shto VITE_SUPABASE_URL dhe VITE_SUPABASE_ANON_KEY.')
  }
}

function normalizeRole(value: unknown): UserRole | null {
  if (typeof value !== 'string') return null
  const role = value.toUpperCase()
  if (role === 'OWNER' || role === 'WORKER') return role
  return null
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
  else if (role === 'OWNER') window.location.hash = '#/pronari'
  else window.location.hash = '#/kycu'
}

export async function signIn(email: string, password: string): Promise<Profile> {
  requireSupabase()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  const profile = await ensureProfileAfterLogin()
  if (!profile) throw new Error('Profili i përdoruesit mungon. Bëj regjistrim përsëri ose kontakto administratorin.')
  return profile
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
  // Mos e blloko regjistrimin nga insert-i i profiles.
  // Profili krijohet automatikisht pas kyçjes përmes ensureProfileAfterLogin().
  return { role, emailConfirmationRequired: !data.session }
}

export async function signOut(): Promise<void> {
  if (isSupabaseConfigured) await supabase.auth.signOut()
  setMockUser(null)
  window.location.hash = '#/kycu'
}

export function hasSession(): Promise<boolean> {
  if (!isSupabaseConfigured) return Promise.resolve(false)
  return supabase.auth.getSession().then(({ data: { session } }) => Boolean(session))
}
