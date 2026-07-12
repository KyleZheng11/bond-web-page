import { createServerFn } from '@tanstack/react-start'
import { requireUser, supabaseServer } from '#/lib/supabase.server'

export const updateLocation = createServerFn()
  .inputValidator((d: { location: string }) => d)
  .handler(async ({ data }) => {
    const user = await requireUser()
    const { error } = await supabaseServer
      .from('users')
      .update({ location: data.location })
      .eq('id', user.id)
    if (error) throw new Error(error.message)
  })
