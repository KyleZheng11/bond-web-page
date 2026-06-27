import { createServerFn } from '@tanstack/react-start'
import { supabaseServer } from '#/lib/supabase.server'

export const updateUserProfile = createServerFn()
  .inputValidator((d: {
    userId: string
    display_name: string
    location: string
    dietary_restrictions: string[]
    cuisine_blacklist?: string[]
  }) => d)
  .handler(async ({ data }) => {
    const { error } = await supabaseServer
      .from('users')
      .update({
        display_name: data.display_name,
        location: data.location,
        dietary_restrictions: data.dietary_restrictions,
      })
      .eq('id', data.userId)
    if (error) throw new Error(error.message)

    if (data.cuisine_blacklist && data.cuisine_blacklist.length > 0) {
      await supabaseServer
        .from('users')
        .update({ cuisine_blacklist: data.cuisine_blacklist })
        .eq('id', data.userId)
    }
  })
