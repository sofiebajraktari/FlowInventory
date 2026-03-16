import { supabase, isSupabaseConfigured } from './supabase.js'
import type { Profile, UserRole } from '../types.js'
import { getMockUser, setMockUser } from '../types.js'

export async function getProfile(): Promise<Profile | null> {
  if (!isSupabaseConfigured) {
    const mock = getMockUser()
    return mock ? { role: mock.role } : null
  }
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data, error } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (error || !data) return null
  return data as Profile
}

export function redirectByRole(role: UserRole): void {
  if (role === 'WORKER') window.location.hash = '#/mungesat'
  else if (role === 'OWNER') window.location.hash = '#/pronari'
  else window.location.hash = '#/kycu'
}

export async function signIn(email: string, password: string): Promise<Profile> {
  if (!isSupabaseConfigured) {
    const role = (document.getElementById('demo-role') as HTMLSelectElement)?.value as UserRole
    if (!role || (role !== 'OWNER' && role !== 'WORKER')) throw new Error('Zgjidhni rol për modalitetin demo.')
    setMockUser({ email: email.trim(), role })
    return { role }
  }
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  const profile = await getProfile()
  if (!profile) throw new Error('Profili nuk u gjet. Kontakto administratorin.')
  return profile
}

export async function signUp(email: string, password: string, role: UserRole): Promise<{ role: UserRole }> {
  if (!role || (role !== 'OWNER' && role !== 'WORKER')) throw new Error('Zgjidhni rol: Pronari ose Punëtori.')
  if (!isSupabaseConfigured) {
    setMockUser({ email: email.trim(), role })
    return { role }
  }
  const { data: { user }, error: authError } = await supabase.auth.signUp({ email, password })
  if (authError) throw authError
  if (!user) throw new Error('Regjistrimi dështoi.')
  const { error: profileError } = await supabase.from('profiles').insert({ id: user.id, role })
  if (profileError) throw profileError
  return { role }
}

export async function signOut(): Promise<void> {
  if (!isSupabaseConfigured) setMockUser(null)
  else await supabase.auth.signOut()
  window.location.hash = '#/kycu'
}

export function hasSession(): Promise<boolean> {
  if (!isSupabaseConfigured) return Promise.resolve(Boolean(getMockUser()))
  return supabase.auth.getSession().then(({ data: { session } }) => Boolean(session))
}
