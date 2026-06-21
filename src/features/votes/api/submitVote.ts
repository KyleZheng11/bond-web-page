import { createServerFn } from '@tanstack/react-start'
import { supabaseServer } from '#/lib/supabase.server'

export const submitVote = createServerFn()
  .inputValidator((d: { partyId: string; voterId: string; restaurantId: string }) => d)
  .handler(async ({ data }) => {
    // Upsert so re-voting just changes the pick (one vote per voter per party)
    const { error } = await supabaseServer
      .from('votes')
      .upsert(
        { party_id: data.partyId, voter_id: data.voterId, restaurant_id: data.restaurantId },
        { onConflict: 'party_id,voter_id' },
      )
    if (error) throw new Error(error.message)
    return { ok: true }
  })
