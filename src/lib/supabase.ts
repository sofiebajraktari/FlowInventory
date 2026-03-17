import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL ?? ''
const supabaseAnonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY ?? ''

const hasSupabase = Boolean(supabaseUrl && supabaseAnonKey)
if (!hasSupabase) {
  console.warn('Supabase: Mungojnë VITE_SUPABASE_URL ose VITE_SUPABASE_ANON_KEY.')
}

let client: SupabaseClient
if (hasSupabase) {
  client = createClient(supabaseUrl, supabaseAnonKey)
} else {
  // Dummy klient vetëm për të kënaqur tipizimin; nuk përdoret kur mungon konfigurimi.
  client = {} as SupabaseClient
}

export const supabase = client
export const isSupabaseConfigured = hasSupabase
