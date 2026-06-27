import { createServerFn } from '@tanstack/react-start'
import { supabaseServer } from '#/lib/supabase.server'

export const updateUserProfile = createServerFn()
  .inputValidator((d: {
    userId: string
    location: string
    dietary_restrictions: string[]
    cuisine_blacklist: string[]
  }) => d)
  .handler(async ({ data }) => {
    const { error } = await supabaseServer
      .from('users')
      .update({
        location: data.location,
        dietary_restrictions: data.dietary_restrictions,
        cuisine_blacklist: data.cuisine_blacklist,
      })
      .eq('id', data.userId)
    if (error) throw new Error(error.message)
  })
