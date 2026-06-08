import { createServerFn } from '@tanstack/react-start'
import { supabaseServer } from '#/lib/supabase.server'

export const getMyParties = createServerFn()
  .inputValidator((d: { userId: string }) => d)
  .handler(async ({ data }) => {
    const { data: parties, error } = await supabaseServer
      .from('parties')
      .select('*')
      .eq('creator_id', data.userId)
      .order('created_at', { ascending: false })

    if (error) throw new Error(error.message)
    return parties ?? []
  })
