import { createServerFn } from '@tanstack/react-start'
import { requireUser, supabaseServer } from '#/lib/supabase.server'

export const updateDietaryRestrictions = createServerFn()
  .inputValidator((d: { restrictions: string[] }) => d)
  .handler(async ({ data }) => {
    const user = await requireUser()
    const { error } = await supabaseServer
      .from('users')
      .update({ dietary_restrictions: data.restrictions })
      .eq('id', user.id)
    if (error) throw new Error(error.message)
  })
