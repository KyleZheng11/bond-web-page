import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '#/types/database'

// Session lives in cookies (not localStorage) so the server can see who's
// logged in — route guards run on the server during SSR, and server
// functions need the caller's identity from the request.
export const supabase = createBrowserClient<Database>(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
)
