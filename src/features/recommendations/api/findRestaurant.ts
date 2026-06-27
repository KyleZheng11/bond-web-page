import { createServerFn } from '@tanstack/react-start'
import { supabaseServer } from '#/lib/supabase.server'
import { aggregatePreferences } from '../lib/aggregatePreferences'
import { geocodeLocation, searchNearbyRestaurants, resolvePhotoUrl, CUISINE_TO_GOOGLE_TYPE, tiersToGooglePriceLevels } from '../lib/googlePlaces'
import type { Place } from '../lib/googlePlaces'
import type { Candidate } from '../types'
import type { Json } from '#/types/database'

// Cap the review-count benefit at 800 so high-volume chains don't automatically
// outrank well-rated local restaurants with fewer reviews.
function scorePlace(place: Place): number {
  return place.rating * Math.log(Math.min(place.reviewCount, 800) + 1)
}

function normalizeRestaurantName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

async function withPhoto(place: Place): Promise<Place> {
  if (!place.photoName) return place
  const photoUrl = await resolvePhotoUrl(place.photoName)
  return { ...place, photoUrl }
}

const TARGET = 4

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

    const candidates: Array<{ place: Place; slot: 1 | 2 | 3 | 4; slotLabel: string }> = []
    const usedIds = new Set<string>()
    const usedNames = new Set<string>()

    // Google's Nearby Search API does not support priceLevels filtering in the request body
    // (only Text Search does). We pass priceLevels in the request anyway for forward
    // compatibility, but enforce the budget constraint ourselves after results come back.
    // Places with PRICE_LEVEL_UNSPECIFIED are allowed through — no price data means unknown,
    // not expensive.
    const budgetLevelSet = new Set(signal.commonPriceLevels)

    // For vegan/vegetarian: filter at the place level using Google's servesVegetarianFood field.
    // For other restrictions (gluten-free, halal, kosher, dairy-free): Google Places has no
    // equivalent field, so we restrict the cuisine types searched to those known to accommodate
    // those restrictions. This is the best guarantee the API allows.
    const needsVegetarianFilter = signal.needsVegan || signal.needsVegetarian
    const hasNonVegRestrictions = signal.dietaryRestrictions.some(
      (r) => !['vegan', 'vegetarian'].includes(r.toLowerCase()),
    )

    // Build the ordered list of cuisines to search.
    // When there are non-vegetarian dietary restrictions, we only search cuisines that are
    // known to accommodate them. If none of the group's preferred cuisines qualify, fall
    // back to the dietary-friendly list.
    const searchCuisines: string[] = (() => {
      if (!hasNonVegRestrictions) return signal.rankedCuisines
      const friendlySet = new Set(signal.dietaryCuisines)
      const compatible = signal.rankedCuisines.filter((c) => friendlySet.has(c))
      return compatible.length > 0 ? compatible : signal.dietaryCuisines
    })()

    // fill() takes an optional priceSet override. Pass an empty Set to skip price filtering.
    async function fill(cuisineLabel: string | null, priceSet: Set<string> = budgetLevelSet): Promise<void> {
      if (candidates.length >= TARGET) return

      const includedTypes =
        cuisineLabel && CUISINE_TO_GOOGLE_TYPE[cuisineLabel]
          ? [CUISINE_TO_GOOGLE_TYPE[cuisineLabel]]
          : ['restaurant']

      const places = await searchNearbyRestaurants({
        ...coords,
        priceLevels: signal.commonPriceLevels,
        includedTypes,
      })

      const sorted = places
        .filter(
          (p) =>
            !usedIds.has(p.id) &&
            !usedNames.has(normalizeRestaurantName(p.name)) &&
            p.rating > 0 &&
            p.reviewCount > 10 &&
            (!needsVegetarianFilter || p.servesVegetarianFood) &&
            // Respect budget when we have data; unspecified price passes through.
            // If priceSet is empty, skip the filter entirely (budget-relaxation fallback).
            (priceSet.size === 0 || p.priceLevel === 'PRICE_LEVEL_UNSPECIFIED' || priceSet.has(p.priceLevel)),
        )
        .sort((a, b) => scorePlace(b) - scorePlace(a))

      for (const place of sorted) {
        if (candidates.length >= TARGET) break
        const slot = (candidates.length + 1) as 1 | 2 | 3 | 4
        candidates.push({ place, slot, slotLabel: cuisineLabel ?? 'Restaurant' })
        usedIds.add(place.id)
        usedNames.add(normalizeRestaurantName(place.name))
      }
    }

    // Primary: top compatible cuisine at common budget
    await fill(searchCuisines[0] ?? null)

    // Fallback: runner-up compatible cuisine to fill any remaining slots
    if (candidates.length < TARGET && searchCuisines[1]) {
      await fill(searchCuisines[1])
    }

    // Budget-relaxation: Google labels many affordable restaurants as MODERATE rather than
    // INEXPENSIVE, so strict filtering can leave us short. Expand one price tier at a time
    // until we have enough candidates, rather than jumping straight to no filter.
    let relaxedTier = signal.commonBudget + 1
    while (candidates.length < TARGET && relaxedTier <= 4) {
      const relaxedLevels = new Set(tiersToGooglePriceLevels(relaxedTier))
      await fill(searchCuisines[0] ?? null, relaxedLevels)
      if (candidates.length < TARGET && searchCuisines[1]) {
        await fill(searchCuisines[1], relaxedLevels)
      }
      relaxedTier++
    }

    if (candidates.length === 0) {
      throw new Error('No restaurants found nearby. Try a different location.')
    }

    // Resolve photos in parallel (non-fatal)
    const candidatesWithPhotos = await Promise.all(
      candidates.map(async (c) => ({ ...c, place: await withPhoto(c.place).catch(() => c.place) })),
    )

    const result: Candidate[] = candidatesWithPhotos.map((c) => ({
      slot: c.slot,
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
          ranked_alternatives: result as unknown as Json,
        },
        { onConflict: 'party_id' },
      )
    if (recError) throw new Error(recError.message)

    await supabaseServer
      .from('parties')
      .update({ status: 'voting' })
      .eq('id', partyId)

    return result
  })
