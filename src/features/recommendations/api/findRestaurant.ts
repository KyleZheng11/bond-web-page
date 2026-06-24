import { createServerFn } from '@tanstack/react-start'
import { supabaseServer } from '#/lib/supabase.server'
import { aggregatePreferences } from '../lib/aggregatePreferences'
import { geocodeLocation, searchNearbyRestaurants, resolvePhotoUrl, CUISINE_TO_GOOGLE_TYPE } from '../lib/googlePlaces'
import type { Place } from '../lib/googlePlaces'
import type { Candidate } from '../types'
import type { Json } from '#/types/database'

// Cap the review-count benefit at 800 so high-volume chains don't automatically
// outrank well-rated local restaurants with fewer reviews.
function scorePlace(place: Place): number {
  return place.rating * Math.log(Math.min(place.reviewCount, 800) + 1)
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function normalizeRestaurantName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

async function findSlotCandidate(
  coords: { lat: number; lng: number },
  cuisineLabel: string | null,
  priceLevels: string[],
  excludeIds: Set<string>,
): Promise<Place | null> {
  const includedTypes = cuisineLabel && CUISINE_TO_GOOGLE_TYPE[cuisineLabel]
    ? [CUISINE_TO_GOOGLE_TYPE[cuisineLabel]]
    : ['restaurant']

  const places = await searchNearbyRestaurants({ ...coords, priceLevels, includedTypes })

  const candidate = places
    .filter((p) => !excludeIds.has(p.id) && p.rating > 0 && p.reviewCount > 10)
    .sort((a, b) => scorePlace(b) - scorePlace(a))[0]

  return candidate ?? null
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
    const usedIds = new Set<string>()
    const rawCandidates: Array<{ place: Place; slot: 1 | 2 | 3 | 4; slotLabel: string }> = []

    // Slot 1 — top cuisine at common budget
    const slot1Cuisine = signal.rankedCuisines[0] ?? null
    const slot1Place = await findSlotCandidate(coords, slot1Cuisine, signal.commonPriceLevels, usedIds)
    if (slot1Place) {
      rawCandidates.push({ place: slot1Place, slot: 1, slotLabel: 'Top pick' })
      usedIds.add(slot1Place.id)
    }

    // Slot 2 — runner-up cuisine at common budget
    const slot2Cuisine = signal.rankedCuisines[1] ?? slot1Cuisine
    const slot2Place = await findSlotCandidate(coords, slot2Cuisine, signal.commonPriceLevels, usedIds)
    if (slot2Place) {
      rawCandidates.push({ place: slot2Place, slot: 2, slotLabel: 'Runner up' })
      usedIds.add(slot2Place.id)
    }

    // Slot 3 — minority cuisine ("for everyone") at common budget
    const slot3Cuisine = signal.minorityCuisine ?? signal.rankedCuisines[2] ?? slot2Cuisine ?? slot1Cuisine
    const slot3Place = await findSlotCandidate(coords, slot3Cuisine, signal.commonPriceLevels, usedIds)
    if (slot3Place) {
      rawCandidates.push({ place: slot3Place, slot: 3, slotLabel: 'For everyone' })
      usedIds.add(slot3Place.id)
    }

    // Slot 4 — flex: dietary pick (best across all friendly cuisines) > splurge > alternative
    let slot4Place: Place | null = null
    let slot4Label = 'Alternative'

    if (signal.dietaryCuisines.length > 0) {
      // Search all dietary-friendly cuisines in parallel and pick the highest-scoring
      // result across all of them. This prevents the slot from always landing on the
      // same cuisine/restaurant regardless of what's actually nearby.
      const dietaryResults = await Promise.all(
        signal.dietaryCuisines.map((c) => findSlotCandidate(coords, c, signal.commonPriceLevels, usedIds))
      )
      slot4Place = dietaryResults
        .filter((p): p is Place => p !== null)
        .sort((a, b) => scorePlace(b) - scorePlace(a))[0] ?? null
      if (slot4Place) slot4Label = 'Dietary pick'
    }
    if (!slot4Place && signal.hasHigherBudget) {
      slot4Place = await findSlotCandidate(coords, slot1Cuisine, signal.maxPriceLevels, usedIds)
      if (slot4Place) slot4Label = 'Splurge'
    }
    if (!slot4Place) {
      const slot4Cuisine = signal.rankedCuisines[2] ?? slot1Cuisine
      slot4Place = await findSlotCandidate(coords, slot4Cuisine, signal.commonPriceLevels, usedIds)
    }
    if (slot4Place) {
      rawCandidates.push({ place: slot4Place, slot: 4, slotLabel: slot4Label })
      usedIds.add(slot4Place.id)
    }

    if (rawCandidates.length === 0) {
      throw new Error('No restaurants found nearby. Try a different location.')
    }

    // Dedup by place ID first, then by normalized name.
    // For same-name restaurants at different locations, keep the closest one.
    const targetLat = coords.lat
    const targetLng = coords.lng

    function distKm(place: Place): number {
      if (place.lat == null || place.lng == null) return Infinity
      return haversineKm(targetLat, targetLng, place.lat, place.lng)
    }

    // Step 1: ID dedup
    const seenIds = new Set<string>()
    const idDeduped = rawCandidates.filter((c) => {
      if (seenIds.has(c.place.id)) return false
      seenIds.add(c.place.id)
      return true
    })

    // Step 2: name dedup — keep the closer location of any same-named restaurant
    const byName = new Map<string, typeof idDeduped[0]>()
    for (const c of idDeduped) {
      const key = normalizeRestaurantName(c.place.name)
      const existing = byName.get(key)
      if (!existing || distKm(c.place) < distKm(existing.place)) {
        byName.set(key, c)
      }
    }
    const dedupedCandidates = [...byName.values()].sort((a, b) => a.slot - b.slot)

    // Fill any gaps left by dedup with a broad fallback search
    if (dedupedCandidates.length < rawCandidates.length) {
      const allUsedIds = new Set(dedupedCandidates.map((c) => c.place.id))
      const allUsedNames = new Set(dedupedCandidates.map((c) => normalizeRestaurantName(c.place.name)))

      const broadPool = await searchNearbyRestaurants({
        ...coords,
        priceLevels: signal.commonPriceLevels,
        includedTypes: ['restaurant'],
      })
      const spares = broadPool
        .filter((p) => !allUsedIds.has(p.id) && !allUsedNames.has(normalizeRestaurantName(p.name)) && p.rating > 0)
        .sort((a, b) => scorePlace(b) - scorePlace(a))

      for (const spare of spares) {
        if (dedupedCandidates.length >= rawCandidates.length) break
        const slot = (dedupedCandidates.length + 1) as 1 | 2 | 3 | 4
        dedupedCandidates.push({ place: spare, slot, slotLabel: 'Alternative' })
        allUsedIds.add(spare.id)
        allUsedNames.add(normalizeRestaurantName(spare.name))
      }
    }

    // Resolve photos in parallel (non-fatal)
    const candidatesWithPhotos = await Promise.all(
      dedupedCandidates.map(async (c) => ({ ...c, place: await withPhoto(c.place).catch(() => c.place) }))
    )

    const candidates: Candidate[] = candidatesWithPhotos.map((c) => ({
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
          ranked_alternatives: candidates as unknown as Json,
        },
        { onConflict: 'party_id' },
      )
    if (recError) throw new Error(recError.message)

    await supabaseServer
      .from('parties')
      .update({ status: 'voting' })
      .eq('id', partyId)

    return candidates
  })
