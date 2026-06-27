import { createServerFn } from '@tanstack/react-start'
import { supabaseServer } from '#/lib/supabase.server'

export const updateCuisineBlacklist = createServerFn()
  .inputValidator((d: { userId: string; blacklist: string[] }) => d)
  .handler(async ({ data }) => {
    const { error } = await supabaseServer
      .from('users')
      .update({ cuisine_blacklist: data.blacklist })
      .eq('id', data.userId)
    if (error) throw new Error(error.message)
  })
