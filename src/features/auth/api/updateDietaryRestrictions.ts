import { createServerFn } from '@tanstack/react-start'
import { supabaseServer } from '#/lib/supabase.server'

export const updateDietaryRestrictions = createServerFn()
  .inputValidator((d: { userId: string; restrictions: string[] }) => d)
  .handler(async ({ data }) => {
    const { error } = await supabaseServer
      .from('users')
      .upsert(
        { id: data.userId, email: '', dietary_restrictions: data.restrictions },
        { onConflict: 'id' },
      )
    if (error) throw new Error(error.message)
  })
