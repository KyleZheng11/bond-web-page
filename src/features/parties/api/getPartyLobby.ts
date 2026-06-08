import { createServerFn } from '@tanstack/react-start'
import { supabaseServer } from '#/lib/supabase.server'

export const getPartyLobby = createServerFn()
  .inputValidator((d: { partyId: string; userId: string }) => d)
  .handler(async ({ data }) => {
    const { data: party, error: partyError } = await supabaseServer
      .from('parties')
      .select('*')
      .eq('id', data.partyId)
      .single()

    if (partyError || !party) throw new Error('Party not found')
    if (party.creator_id !== data.userId) throw new Error('Unauthorized')

    const { data: members } = await supabaseServer
      .from('party_members')
      .select('*')
      .eq('party_id', data.partyId)
      .order('joined_at', { ascending: true })

    const { data: leaderPref } = await supabaseServer
      .from('preferences')
      .select('id')
      .eq('party_id', data.partyId)
      .eq('user_id', data.userId)
      .maybeSingle()

    return {
      party,
      members: members ?? [],
      leaderHasSubmitted: !!leaderPref,
    }
  })
