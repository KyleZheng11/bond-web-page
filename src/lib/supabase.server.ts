import { createClient } from '@supabase/supabase-js'
import type { Database } from '#/types/database'

// Service role key bypasses RLS — only used in server functions, never in the browser.
export const supabaseServer = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)
