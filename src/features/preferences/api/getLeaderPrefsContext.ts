import { createServerFn } from '@tanstack/react-start'
import { requireUser, supabaseServer } from '#/lib/supabase.server'

export const getLeaderPrefsContext = createServerFn().handler(async () => {
  const user = await requireUser()
  const { data: profile } = await supabaseServer
    .from('users')
    .select('dietary_restrictions, cuisine_blacklist')
    .eq('id', user.id)
    .maybeSingle()

  return {
    profileDietaryRestrictions: profile?.dietary_restrictions ?? [],
    profileCuisineBlacklist: profile?.cuisine_blacklist ?? [],
  }
})
