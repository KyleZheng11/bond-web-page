import { createServerFn } from '@tanstack/react-start'
import { requireUser, supabaseServer } from '#/lib/supabase.server'

export const updateUserProfile = createServerFn()
  .inputValidator((d: {
    display_name?: string
    location: string
    dietary_restrictions: string[]
    cuisine_blacklist: string[]
  }) => d)
  .handler(async ({ data }) => {
    const user = await requireUser()
    const { error } = await supabaseServer
      .from('users')
      .update({
        location: data.location,
        dietary_restrictions: data.dietary_restrictions,
        cuisine_blacklist: data.cuisine_blacklist,
        ...(data.display_name !== undefined && { display_name: data.display_name }),
      })
      .eq('id', user.id)
    if (error) throw new Error(error.message)
  })
