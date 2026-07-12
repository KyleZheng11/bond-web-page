import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { getCookies, setCookie } from '@tanstack/react-start/server'
import type { Database } from '#/types/database'

// Service role key bypasses RLS — only used in server functions, never in the browser.
export const supabaseServer = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

// Client bound to the calling request's auth cookies. Used only to answer
// "who is making this request?" — data access still goes through supabaseServer.
function supabaseAuth() {
  return createServerClient<Database>(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll: () =>
          Object.entries(getCookies()).map(([name, value]) => ({ name, value })),
        setAll: (cookies) => {
          for (const { name, value, options } of cookies) setCookie(name, value, options)
        },
      },
    },
  )
}

// The authenticated user for this request, or null. getUser() validates the
// token with Supabase rather than trusting the cookie contents.
export async function getSessionUser() {
  const { data } = await supabaseAuth().auth.getUser()
  return data.user
}

// For server functions that must not run anonymously.
export async function requireUser() {
  const user = await getSessionUser()
  if (!user) throw new Error('You must be signed in.')
  return user
}
