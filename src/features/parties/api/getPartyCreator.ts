import { createServerFn } from '@tanstack/react-start'
import { supabaseServer } from '#/lib/supabase.server'

export const getPartyCreator = createServerFn()
  .inputValidator((d: { partyId: string }) => d)
  .handler(async ({ data }) => {
    const { data: party, error } = await supabaseServer
      .from('parties').select('creator_id').eq('id', data.partyId).single()
    if (error || !party) throw new Error('Party not found')
    return party
  })
