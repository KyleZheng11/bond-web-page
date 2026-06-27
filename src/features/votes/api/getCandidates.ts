import { createServerFn } from '@tanstack/react-start'
import { supabaseServer } from '#/lib/supabase.server'
import type { Candidate } from '#/features/recommendations'

export const getCandidates = createServerFn()
  .inputValidator((d: { partyId: string }) => d)
  .handler(async ({ data }) => {
    const [recResult, votesResult, prefCountResult, partyResult] = await Promise.all([
      supabaseServer.from('recommendations').select('ranked_alternatives').eq('party_id', data.partyId).single(),
      supabaseServer.from('votes').select('voter_id, restaurant_id').eq('party_id', data.partyId),
      // Count from preferences (not party_members) so the leader is included
      supabaseServer.from('preferences').select('id', { count: 'exact', head: true }).eq('party_id', data.partyId),
      supabaseServer.from('parties').select('creator_id').eq('id', data.partyId).single(),
    ])

    const candidates = (recResult.data?.ranked_alternatives ?? []) as unknown as Candidate[]

    const voteCounts: Record<string, number> = {}
    for (const v of votesResult.data ?? []) {
      voteCounts[v.restaurant_id] = (voteCounts[v.restaurant_id] ?? 0) + 1
    }

    return {
      candidates,
      voteCounts,
      totalVoters: prefCountResult.count ?? 0,
      votesCast: (votesResult.data ?? []).length,
      creatorId: partyResult.data?.creator_id ?? null,
    }
  })
