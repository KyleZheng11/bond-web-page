import { createServerFn } from '@tanstack/react-start'
import { supabaseServer } from '#/lib/supabase.server'
import type { Candidate } from '#/features/recommendations'

export const getCandidates = createServerFn()
  .inputValidator((d: { partyId: string }) => d)
  .handler(async ({ data }) => {
    const { data: rec } = await supabaseServer
      .from('recommendations')
      .select('ranked_alternatives')
      .eq('party_id', data.partyId)
      .single()

    const candidates = (rec?.ranked_alternatives ?? []) as unknown as Candidate[]

    const { data: votes } = await supabaseServer
      .from('votes')
      .select('voter_id, restaurant_id')
      .eq('party_id', data.partyId)

    const voteCounts: Record<string, number> = {}
    for (const v of votes ?? []) {
      voteCounts[v.restaurant_id] = (voteCounts[v.restaurant_id] ?? 0) + 1
    }

    const { count: memberCount } = await supabaseServer
      .from('party_members')
      .select('id', { count: 'exact', head: true })
      .eq('party_id', data.partyId)
      .not('preferences_submitted_at', 'is', null)

    return {
      candidates,
      voteCounts,
      totalVoters: memberCount ?? 0,
      votesCast: (votes ?? []).length,
    }
  })
