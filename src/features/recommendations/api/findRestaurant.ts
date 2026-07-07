import { createServerFn } from '@tanstack/react-start'
import { supabaseServer } from '#/lib/supabase.server'
import { aggregatePreferences } from '../lib/aggregatePreferences'
import { geocodeLocation, searchNearbyRestaurants, resolvePhotoUrl, CUISINE_TO_GOOGLE_TYPE } from '../lib/googlePlaces'
import type { Place } from '../lib/googlePlaces'
import type { Candidate } from '../types'
import type { Json } from '#/types/database'

const TARGET = 3

// Cap the review-count benefit at 50 so high-volume chains don't automatically
// outrank well-rated local restaurants with fewer reviews.
function scorePlace(place: Place): number {
  return place.rating * Math.log(Math.min(place.reviewCount, 50) + 1)
}

function normalizeRestaurantName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// Searches one cuisine and fills as many remaining candidate slots as
// possible from it, ranked by score. Only called again for the runner-up
// cuisine if the top cuisine alone didn't reach TARGET.
async function fill(
  coords: { lat: number; lng: number },
  cuisineLabel: string | null,
  priceLevels: string[],
  vegetarianOnly: boolean,
  slotLabel: string,
  candidates: Array<{ place: Place; slotLabel: string }>,
  usedIds: Set<string>,
  usedNames: Set<string>,
): Promise<void> {
  if (candidates.length >= TARGET) return

  const includedTypes = cuisineLabel && CUISINE_TO_GOOGLE_TYPE[cuisineLabel]
    ? [CUISINE_TO_GOOGLE_TYPE[cuisineLabel]]
    : ['restaurant']

  const places = await searchNearbyRestaurants({ ...coords, priceLevels, includedTypes })

  let pool = places.filter((p) =>
    p.rating > 0 && p.reviewCount > 10 &&
    !usedIds.has(p.id) && !usedNames.has(normalizeRestaurantName(p.name)),
  )

  if (vegetarianOnly) {
    const vegPool = pool.filter((p) => p.servesVegetarianFood === true)
    // Only apply the hard filter when there are actual results — avoids empty slots
    if (vegPool.length > 0) pool = vegPool
  }

  const ranked = pool.sort((a, b) => scorePlace(b) - scorePlace(a))

  for (const place of ranked) {
    if (candidates.length >= TARGET) break
    candidates.push({ place, slotLabel })
    usedIds.add(place.id)
    usedNames.add(normalizeRestaurantName(place.name))
  }
}

async function withPhoto(place: Place): Promise<Place> {
  if (!place.photoName) return place
  const photoUrl = await resolvePhotoUrl(place.photoName)
  return { ...place, photoUrl }
}

export const findRestaurant = createServerFn()
  .inputValidator((d: { partyId: string }) => d)
  .handler(async ({ data }) => {
    const { partyId } = data

    const { data: party, error: partyError } = await supabaseServer
      .from('parties').select('*').eq('id', partyId).single()
    if (partyError || !party) throw new Error('Party not found')
    if (!party.location) throw new Error('Party has no location set')

    const { data: preferences, error: prefsError } = await supabaseServer
      .from('preferences').select('*').eq('party_id', partyId)
    if (prefsError) throw new Error(prefsError.message)
    if (!preferences?.length) throw new Error('No preferences submitted yet')

    const { data: creatorProfile } = await supabaseServer
      .from('users')
      .select('cuisine_blacklist')
      .eq('id', party.creator_id)
      .maybeSingle()
    const cuisineBlacklist = creatorProfile?.cuisine_blacklist ?? []

    const signal = aggregatePreferences(preferences, cuisineBlacklist)
    const coords = await geocodeLocation(party.location)
    const vegOnly = signal.needsVegan || signal.needsVegetarian

    const candidates: Array<{ place: Place; slotLabel: string }> = []
    const usedIds = new Set<string>()
    const usedNames = new Set<string>()

    // Only the group's top cuisine preference and budget — fall back to the
    // runner-up cuisine (same budget) if that alone doesn't fill 4 slots.
    // The card label is the cuisine itself rather than a generic tag.
    const topCuisine = signal.rankedCuisines[0] ?? null
    await fill(coords, topCuisine, signal.commonPriceLevels, vegOnly, topCuisine ?? 'Nearby', candidates, usedIds, usedNames)

    if (candidates.length < TARGET) {
      const runnerUpCuisine = signal.rankedCuisines[1] ?? null
      if (runnerUpCuisine) {
        await fill(coords, runnerUpCuisine, signal.commonPriceLevels, vegOnly, runnerUpCuisine, candidates, usedIds, usedNames)
      }
    }

    if (candidates.length === 0) {
      throw new Error('No restaurants found nearby. Try a different location.')
    }

    // Resolve photos in parallel (non-fatal)
    const candidatesWithPhotos = await Promise.all(
      candidates.map(async (c) => ({ ...c, place: await withPhoto(c.place).catch(() => c.place) }))
    )

    const ranked: Candidate[] = candidatesWithPhotos.map((c, i) => ({
      slot: (i + 1) as 1 | 2 | 3,
      slotLabel: c.slotLabel,
      place: c.place,
    }))

    // Store candidates; winner fields are filled in after voting
    const { error: recError } = await supabaseServer
      .from('recommendations')
      .upsert(
        {
          party_id: partyId,
          restaurant_id: 'pending',
          restaurant_name: 'pending',
          restaurant_data: {} as Json,
          reason: 'pending',
          ranked_alternatives: ranked as unknown as Json,
        },
        { onConflict: 'party_id' },
      )
    if (recError) throw new Error(recError.message)

    await supabaseServer
      .from('parties')
      .update({ status: 'voting' })
      .eq('id', partyId)

    return ranked
  })
