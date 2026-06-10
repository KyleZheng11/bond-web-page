import { createServerFn } from '@tanstack/react-start'
import { supabaseServer } from '#/lib/supabase.server'

export const getRecommendation = createServerFn()
  .inputValidator((d: { partyId: string }) => d)
  .handler(async ({ data }) => {
    const { data: rec, error } = await supabaseServer
      .from('recommendations')
      .select('*')
      .eq('party_id', data.partyId)
      .single()
    if (error || !rec) throw new Error('Recommendation not found')
    return rec
  })
