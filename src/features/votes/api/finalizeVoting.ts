import { createServerFn } from '@tanstack/react-start'
import { supabaseServer } from '#/lib/supabase.server'
import type { Candidate } from '#/features/recommendations'
import type { Json } from '#/types/database'

export const finalizeVoting = createServerFn()
  .inputValidator((d: { partyId: string }) => d)
  .handler(async ({ data }) => {
    const { partyId } = data

    const { data: rec } = await supabaseServer
      .from('recommendations')
      .select('ranked_alternatives')
      .eq('party_id', partyId)
      .single()

    const candidates = (rec?.ranked_alternatives ?? []) as unknown as Candidate[]
    if (candidates.length === 0) throw new Error('No candidates found.')

    const { data: votes } = await supabaseServer
      .from('votes')
      .select('restaurant_id')
      .eq('party_id', partyId)

    // Tally votes
    const tally: Record<string, number> = {}
    for (const v of votes ?? []) {
      tally[v.restaurant_id] = (tally[v.restaurant_id] ?? 0) + 1
    }

    // Find highest vote count
    const maxVotes = Math.max(0, ...Object.values(tally))

    // Collect all tied winners
    const tiedIds = Object.entries(tally)
      .filter(([, count]) => count === maxVotes)
      .map(([id]) => id)

    // If still tied after considering votes, pick the first candidate by slot order as tiebreaker
    const winner = tiedIds.length === 1
      ? candidates.find((c) => c.place.id === tiedIds[0])
      : candidates
          .filter((c) => tiedIds.includes(c.place.id))
          .sort((a, b) => a.slot - b.slot)[0]

    // Fall back to slot-1 candidate if no votes were cast at all
    const finalWinner = winner ?? candidates[0]
    const { place, slotLabel } = finalWinner

    const voteCount = tally[place.id] ?? 0
    const totalVotes = (votes ?? []).length
    const reason = totalVotes > 0
      ? `Your group voted — ${place.name} came out on top with ${voteCount} of ${totalVotes} vote${totalVotes !== 1 ? 's' : ''}. Rated ${place.rating}★ from ${place.reviewCount.toLocaleString()} reviews.`
      : `Bond's ${slotLabel.toLowerCase()} — rated ${place.rating}★ from ${place.reviewCount.toLocaleString()} reviews.`

    const { error: updateError } = await supabaseServer
      .from('recommendations')
      .update({
        restaurant_id: place.id,
        restaurant_name: place.name,
        restaurant_data: place as unknown as Json,
        reason,
      })
      .eq('party_id', partyId)
    if (updateError) throw new Error(updateError.message)

    await supabaseServer
      .from('parties')
      .update({ status: 'resolved', resolved_at: new Date().toISOString() })
      .eq('id', partyId)

    // Broadcast from the server so all vote screen subscribers navigate
    // regardless of their auth state or RLS.
    const broadcastChannel = supabaseServer.channel(`vote:${partyId}`)
    await broadcastChannel.send({ type: 'broadcast', event: 'result_locked', payload: {} })
    await supabaseServer.removeChannel(broadcastChannel)

    return { ok: true, winnerId: place.id }
  })
