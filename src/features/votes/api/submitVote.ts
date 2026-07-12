import { createServerFn } from '@tanstack/react-start'
import { getSessionUser, supabaseServer } from '#/lib/supabase.server'

// Two kinds of voters: logged-in members (identity comes from the session)
// and guests (identity is the unguessable per-member guest token). Either
// way the caller can only ever cast their own vote.
export const submitVote = createServerFn()
  .inputValidator((d: { partyId: string; restaurantId: string; guestToken?: string }) => d)
  .handler(async ({ data }) => {
    let voterId: string

    if (data.guestToken) {
      const { data: member } = await supabaseServer
        .from('party_members')
        .select('id')
        .eq('guest_token', data.guestToken)
        .eq('party_id', data.partyId)
        .maybeSingle()
      if (!member) throw new Error('Invalid invite token for this party.')
      voterId = data.guestToken
    } else {
      const user = await getSessionUser()
      if (!user) throw new Error('You must be signed in to vote.')

      const [{ data: party }, { data: member }] = await Promise.all([
        supabaseServer.from('parties').select('creator_id').eq('id', data.partyId).single(),
        supabaseServer
          .from('party_members')
          .select('id')
          .eq('party_id', data.partyId)
          .eq('user_id', user.id)
          .maybeSingle(),
      ])
      if (party?.creator_id !== user.id && !member) {
        throw new Error('You are not part of this party.')
      }
      voterId = user.id
    }

    // Upsert so re-voting just changes the pick (one vote per voter per party)
    const { error } = await supabaseServer
      .from('votes')
      .upsert(
        { party_id: data.partyId, voter_id: voterId, restaurant_id: data.restaurantId },
        { onConflict: 'party_id,voter_id' },
      )
    if (error) throw new Error(error.message)
    return { ok: true }
  })
