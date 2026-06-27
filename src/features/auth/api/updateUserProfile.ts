import { createServerFn } from '@tanstack/react-start'
import { supabaseServer } from '#/lib/supabase.server'

export const updateUserProfile = createServerFn()
  .inputValidator((d: {
    userId: string
    display_name?: string
    location: string
    dietary_restrictions: string[]
    cuisine_blacklist: string[]
  }) => d)
  .handler(async ({ data }) => {
    const updateData: Record<string, unknown> = {
      location: data.location,
      dietary_restrictions: data.dietary_restrictions,
      cuisine_blacklist: data.cuisine_blacklist,
    }
    if (data.display_name !== undefined) {
      updateData.display_name = data.display_name
    }
    const { error } = await supabaseServer
      .from('users')
      .update(updateData)
      .eq('id', data.userId)
    if (error) throw new Error(error.message)
  })
