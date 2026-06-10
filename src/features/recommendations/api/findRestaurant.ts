import { createServerFn } from '@tanstack/react-start'
import { supabaseServer } from '#/lib/supabase.server'
import { aggregatePreferences } from '../lib/aggregatePreferences'
import { geocodeLocation, searchNearbyRestaurants } from '../lib/googlePlaces'
import { sendSms } from '#/lib/twilio'
import type { Place } from '../lib/googlePlaces'
import type { AggregatedSignal } from '../lib/aggregatePreferences'
import type { Json } from '#/types/database'

function scorePlace(place: Place): number {
  return place.rating * Math.log(place.reviewCount + 1)
}

function filterVetoed(places: Place[], vetoedGoogleTypes: string[]): Place[] {
  if (vetoedGoogleTypes.length === 0) return places
  return places.filter((p) => !p.types.some((t) => vetoedGoogleTypes.includes(t)))
}

function buildReason(place: Place, signal: AggregatedSignal): string {
  const budgetLabels = ['under $15', '$15–30', '$30–60', '$60+']
  const budget = budgetLabels[signal.budgetCeiling - 1] ?? '$15–30'
  const vibeMap: Record<string, string> = {
    casual: 'a casual night out',
    lively: 'a lively, buzzy dinner',
    intimate: 'an intimate evening',
    special: 'a special occasion',
  }

  let reason = signal.dominantVibe
    ? `Your crew wanted ${vibeMap[signal.dominantVibe] ?? signal.dominantVibe}`
    : 'Your crew was open to any vibe'

  reason += `, keeping it ${budget} per person`

  if (signal.vetoedCuisineLabels.length > 0) {
    reason += `, and ruled out ${signal.vetoedCuisineLabels.join(', ')}`
  }

  if (signal.dietaryRestrictions.length > 0) {
    reason += `. ${signal.dietaryRestrictions.join(' and ')} needs were factored in`
  }

  reason += `. ${place.name} came out on top — rated ${place.rating}★ across ${place.reviewCount.toLocaleString()} reviews nearby.`

  return reason
}

export const findRestaurant = createServerFn()
  .inputValidator((d: { partyId: string; siteUrl: string }) => d)
  .handler(async ({ data }) => {
    const { partyId, siteUrl } = data

    const { data: party, error: partyError } = await supabaseServer
      .from('parties').select('*').eq('id', partyId).single()
    if (partyError || !party) throw new Error('Party not found')
    if (!party.location) throw new Error('Party has no location set')

    const { data: preferences, error: prefsError } = await supabaseServer
      .from('preferences').select('*').eq('party_id', partyId)
    if (prefsError) throw new Error(prefsError.message)
    if (!preferences?.length) throw new Error('No preferences submitted yet')

    const signal = aggregatePreferences(preferences)
    const coords = await geocodeLocation(party.location)

    // If any member is vegan/vegetarian, narrow to restaurants that specialise in those
    // options rather than hoping a general restaurant accommodates them
    let includedTypes: string[]
    if (signal.needsVegan) {
      includedTypes = ['vegan_restaurant']
    } else if (signal.needsVegetarian) {
      includedTypes = ['vegetarian_restaurant', 'vegan_restaurant']
    } else {
      includedTypes = ['restaurant']
    }

    const candidates = await searchNearbyRestaurants({
      ...coords,
      priceLevels: signal.priceLevels,
      includedTypes,
    })

    const filtered = filterVetoed(candidates, signal.vetoedGoogleTypes)
      .filter((p) => p.rating > 0 && p.reviewCount > 10)

    if (filtered.length === 0) {
      throw new Error('No matching restaurants found. Try a different location or loosen your preferences.')
    }

    const ranked = [...filtered].sort((a, b) => scorePlace(b) - scorePlace(a))
    const winner = ranked[0]

    const alternatives = ranked.slice(1, 4).map((p, i) => ({
      restaurant_id: p.id,
      restaurant_name: p.name,
      restaurant_data: p,
      reason: `Rated ${p.rating}★ from ${p.reviewCount.toLocaleString()} reviews.`,
      category: (['different_vibe', 'different_cuisine', 'different_budget'] as const)[i],
    }))

    const reason = buildReason(winner, signal)

    const { data: rec, error: recError } = await supabaseServer
      .from('recommendations')
      .insert({
        party_id: partyId,
        restaurant_id: winner.id,
        restaurant_name: winner.name,
        restaurant_data: winner as unknown as Json,
        reason,
        ranked_alternatives: alternatives as unknown as Json,
      })
      .select()
      .single()
    if (recError) throw new Error(recError.message)

    await supabaseServer.from('parties').update({ status: 'resolved' }).eq('id', partyId)

    // Fetch leader name and guest phone numbers, then send result SMS
    // Both are non-fatal — a failed SMS should never block a resolved party
    const [{ data: leader }, { data: guests }] = await Promise.all([
      supabaseServer.from('users').select('display_name, email').eq('id', party.creator_id).single(),
      supabaseServer.from('party_members').select('phone_number, guest_token')
        .eq('party_id', partyId).not('phone_number', 'is', null),
    ])

    const leaderName = leader?.display_name ?? leader?.email?.split('@')[0] ?? 'Your group'

    await Promise.allSettled(
      (guests ?? []).map((g) =>
        sendSms(
          g.phone_number!,
          `${leaderName}'s group is going to ${winner.name}. See the details here: ${siteUrl}/invite/${g.guest_token}`,
        )
      )
    )

    return rec
  })
