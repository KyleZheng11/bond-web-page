import { createServerFn } from '@tanstack/react-start'
import { supabaseServer } from '#/lib/supabase.server'

export const getGuestPartyMembers = createServerFn()
  .inputValidator((d: { token: string }) => d)
  .handler(async ({ data }) => {
    // Try per-member guest token first
    const { data: memberRow } = await supabaseServer
      .from('party_members')
      .select('party_id')
      .eq('guest_token', data.token)
      .maybeSingle()

    let partyId: string

    if (memberRow) {
      partyId = memberRow.party_id
    } else {
      // Fall back to party-level general invite token
      const { data: partyByToken } = await supabaseServer
        .from('parties')
        .select('id')
        .eq('invite_token', data.token)
        .maybeSingle()

      if (!partyByToken) throw new Error('Invalid invite token.')
      partyId = partyByToken.id
    }

    const { data: party } = await supabaseServer
      .from('parties')
      .select('id, name, status, invite_token, creator_id')
      .eq('id', partyId)
      .single()

    if (!party) throw new Error('Party not found.')

    const { data: leader } = await supabaseServer
      .from('users')
      .select('display_name, email')
      .eq('id', party.creator_id)
      .maybeSingle()

    const { data: members } = await supabaseServer
      .from('party_members')
      .select('id, guest_name, preferences_submitted_at')
      .eq('party_id', partyId)
      .order('joined_at', { ascending: true })

    return {
      party: {
        id: party.id,
        name: party.name,
        status: party.status,
        invite_token: party.invite_token,
      },
      leaderName: leader?.display_name ?? leader?.email?.split('@')[0] ?? 'Your host',
      members: members ?? [],
    }
  })
