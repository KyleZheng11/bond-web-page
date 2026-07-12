import { createServerFn } from '@tanstack/react-start'
import { requireUser, supabaseServer } from '#/lib/supabase.server'

export const updateCuisineBlacklist = createServerFn()
  .inputValidator((d: { blacklist: string[] }) => d)
  .handler(async ({ data }) => {
    const user = await requireUser()
    const { error } = await supabaseServer
      .from('users')
      .update({ cuisine_blacklist: data.blacklist })
      .eq('id', user.id)
    if (error) throw new Error(error.message)
  })
