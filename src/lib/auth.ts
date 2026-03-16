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

export async function signUp(
  email: string,
  password: string,
  role: UserRole,
  firstName: string,
  lastName: string
): Promise<{ role: UserRole }> {
  if (!role || (role !== 'OWNER' && role !== 'WORKER')) throw new Error('Zgjidhni rol: Pronari ose Punëtori.')
  if (!firstName.trim() || !lastName.trim()) throw new Error('Emri dhe mbiemri janë të detyrueshëm.')
  if (!isSupabaseConfigured) {
    setMockUser({
      email: email.trim(),
      role,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
    })
    return { role }
  }
  const { data: { user }, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
      },
    },
  })
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
