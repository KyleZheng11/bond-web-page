import { createServerFn } from '@tanstack/react-start'
import { supabaseServer } from '#/lib/supabase.server'

export const getLeaderPrefsContext = createServerFn()
  .inputValidator((d: { userId: string }) => d)
  .handler(async ({ data }) => {
    const { data: profile } = await supabaseServer
      .from('users')
      .select('dietary_restrictions')
      .eq('id', data.userId)
      .maybeSingle()

    return {
      profileDietaryRestrictions: profile?.dietary_restrictions ?? [],
    }
  })
