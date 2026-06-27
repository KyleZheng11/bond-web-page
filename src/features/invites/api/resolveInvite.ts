import { createServerFn } from '@tanstack/react-start'
import { supabaseServer } from '#/lib/supabase.server'

export const resolveInvite = createServerFn()
  .inputValidator((d: { token: string }) => d)
  .handler(async ({ data }) => {
    // 1. Try a per-member SMS token first
    const { data: member } = await supabaseServer
      .from('party_members')
      .select('id, party_id, phone_number, preferences_submitted_at, expires_at')
      .eq('guest_token', data.token)
      .maybeSingle()

    if (member) {
      if (member.expires_at && new Date(member.expires_at) < new Date()) {
        throw new Error('This invite link has expired.')
      }

      const { data: party } = await supabaseServer
        .from('parties')
        .select('id, name, status, creator_id')
        .eq('id', member.party_id)
        .single()

      if (!party) throw new Error('Party not found.')

      const { data: leader } = await supabaseServer
        .from('users')
        .select('display_name, email')
        .eq('id', party.creator_id)
        .maybeSingle()

      const { count } = await supabaseServer
        .from('party_members')
        .select('id', { count: 'exact', head: true })
        .eq('party_id', party.id)

      return {
        tokenType: 'member' as const,
        party: { id: party.id, name: party.name, status: party.status },
        leaderName: leader?.display_name?.trim() || leader?.email?.trim() || 'Someone',
        memberCount: count ?? 0,
        alreadySubmitted: !!member.preferences_submitted_at,
      }
    }

    // 2. Try the party-level general link token
    const { data: party } = await supabaseServer
      .from('parties')
      .select('id, name, status, creator_id')
      .eq('invite_token', data.token)
      .maybeSingle()

    if (!party) throw new Error('This invite link is invalid or has been removed.')

    const { data: leader } = await supabaseServer
      .from('users')
      .select('display_name, email')
      .eq('id', party.creator_id)
      .maybeSingle()

    const { count } = await supabaseServer
      .from('party_members')
      .select('id', { count: 'exact', head: true })
      .eq('party_id', party.id)

    return {
      tokenType: 'party' as const,
      party: { id: party.id, name: party.name, status: party.status },
      leaderName: leader?.display_name?.trim() || leader?.email?.trim() || 'Someone',
      memberCount: count ?? 0,
      alreadySubmitted: false,
    }
  })
