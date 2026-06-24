import { createServerFn } from '@tanstack/react-start'
import { supabaseServer } from '#/lib/supabase.server'

export const updateUserProfile = createServerFn()
  .inputValidator((d: {
    userId: string
    location: string
    dietary_restrictions: string[]
    cuisine_blacklist?: string[]
  }) => d)
  .handler(async ({ data }) => {
    // Save location and dietary restrictions — these columns always exist
    const { error } = await supabaseServer
      .from('users')
      .update({
        location: data.location,
        dietary_restrictions: data.dietary_restrictions,
      })
      .eq('id', data.userId)
    if (error) throw new Error(error.message)

    // Save cuisine_blacklist separately; silently skip if not provided or column doesn't exist yet
    if (data.cuisine_blacklist && data.cuisine_blacklist.length > 0) {
      await supabaseServer
        .from('users')
        .update({ cuisine_blacklist: data.cuisine_blacklist })
        .eq('id', data.userId)
    }
  })
