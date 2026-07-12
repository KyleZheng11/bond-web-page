import { createServerFn } from '@tanstack/react-start'
import { requireUser, supabaseServer } from '#/lib/supabase.server'

export const getPartyLobby = createServerFn()
  .inputValidator((d: { partyId: string }) => d)
  .handler(async ({ data }) => {
    const user = await requireUser()

    const { data: party, error: partyError } = await supabaseServer
      .from('parties')
      .select('*')
      .eq('id', data.partyId)
      .single()

    if (partyError) throw new Error('Party not found')

    const isCreator = party.creator_id === user.id

    const { data: members } = await supabaseServer
      .from('party_members')
      .select('*')
      .eq('party_id', data.partyId)
      .order('joined_at', { ascending: true })

    // Only the creator or an invited member may view the lobby
    const isMember = (members ?? []).some((m) => m.user_id === user.id)
    if (!isCreator && !isMember) throw new Error('You are not part of this party.')

    // Check whether the requesting user has submitted preferences
    const { data: userPref } = await supabaseServer
      .from('preferences')
      .select('id')
      .eq('party_id', data.partyId)
      .eq('user_id', user.id)
      .maybeSingle()

    return {
      party,
      members: members ?? [],
      isCreator,
      leaderHasSubmitted: isCreator ? !!userPref : false,
      memberHasSubmitted: !!userPref,
    }
  })
