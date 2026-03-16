import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL ?? ''
const supabaseAnonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY ?? ''

const hasSupabase = Boolean(supabaseUrl && supabaseAnonKey)
if (!hasSupabase) {
  console.warn('Supabase: Mungojnë VITE_SUPABASE_URL ose VITE_SUPABASE_ANON_KEY. Duke përdorur modalitet demo (pa backend).')
}

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey)
export const isSupabaseConfigured = hasSupabase
