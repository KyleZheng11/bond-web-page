import { createServerFn } from '@tanstack/react-start'
import { requireUser, supabaseServer } from '#/lib/supabase.server'

export const getUserProfile = createServerFn().handler(async () => {
  const user = await requireUser()
  const { data: profile } = await supabaseServer
    .from('users')
    .select('dietary_restrictions, location, cuisine_blacklist')
    .eq('id', user.id)
    .maybeSingle()
  return {
    dietary_restrictions: profile?.dietary_restrictions ?? [],
    location: profile?.location ?? null,
    cuisine_blacklist: profile?.cuisine_blacklist ?? [],
  }
})
