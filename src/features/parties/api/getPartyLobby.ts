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

    const isCreator = party.creator_id === data.userId

    const { data: members } = await supabaseServer
      .from('party_members')
      .select('*')
      .eq('party_id', data.partyId)
      .order('joined_at', { ascending: true })

    // Check whether the requesting user has submitted preferences
    const { data: userPref } = await supabaseServer
      .from('preferences')
      .select('id')
      .eq('party_id', data.partyId)
      .eq('user_id', data.userId)
      .maybeSingle()

    const { data: userProfile } = await supabaseServer
      .from('users')
      .select('display_name, email')
      .eq('id', data.userId)
      .maybeSingle()

    const currentUserDisplayName =
      userProfile?.display_name ?? userProfile?.email?.split('@')[0] ?? null

    return {
      party,
      members: members ?? [],
      isCreator,
      leaderHasSubmitted: isCreator ? !!userPref : false,
      memberHasSubmitted: !!userPref,
      currentUserDisplayName,
    }
  })
