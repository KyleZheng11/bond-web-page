import { createServerFn } from '@tanstack/react-start'
import { getSessionUser, supabaseServer } from '#/lib/supabase.server'

// One auth check for every route guard. Runs on the server (where the
// session cookie is visible) both during SSR and when the client
// navigates — so guards finally agree with the browser about who's
// logged in. Returns null when signed out.
export const getAuthState = createServerFn().handler(async () => {
  const user = await getSessionUser()
  if (!user) return null

  const { data: profile } = await supabaseServer
    .from('users')
    .select('display_name, location')
    .eq('id', user.id)
    .maybeSingle()

  return {
    id: user.id,
    email: user.email ?? null,
    displayName: profile?.display_name ?? null,
    location: profile?.location ?? null,
  }
})
