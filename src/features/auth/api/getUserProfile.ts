import { createServerFn } from '@tanstack/react-start'
import { supabaseServer } from '#/lib/supabase.server'

export const getUserProfile = createServerFn()
  .inputValidator((d: { userId: string }) => d)
  .handler(async ({ data }) => {
    const { data: profile } = await supabaseServer
      .from('users')
      .select('dietary_restrictions, location')
      .eq('id', data.userId)
      .single()
    return {
      dietary_restrictions: profile?.dietary_restrictions ?? [],
      location: profile?.location ?? null,
    }
  })
