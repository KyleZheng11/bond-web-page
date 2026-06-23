import { createServerFn } from '@tanstack/react-start'
import { supabaseServer } from '#/lib/supabase.server'

export const updateLocation = createServerFn()
  .inputValidator((d: { userId: string; location: string }) => d)
  .handler(async ({ data }) => {
    const { error } = await supabaseServer
      .from('users')
      .update({ location: data.location })
      .eq('id', data.userId)
    if (error) throw new Error(error.message)
  })
