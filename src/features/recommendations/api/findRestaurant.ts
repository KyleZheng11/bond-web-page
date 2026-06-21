import { createServerFn } from '@tanstack/react-start'
import { supabaseServer } from '#/lib/supabase.server'
import { aggregatePreferences } from '../lib/aggregatePreferences'
import { geocodeLocation, searchNearbyRestaurants, resolvePhotoUrl, CUISINE_TO_GOOGLE_TYPE } from '../lib/googlePlaces'
import type { Place } from '../lib/googlePlaces'
import type { Candidate } from '../types'
import type { Json } from '#/types/database'

function scorePlace(place: Place): number {
  return place.rating * Math.log(place.reviewCount + 1)
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

    const signal = aggregatePreferences(preferences)
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

    // Slot 4 — flex: dietary pick > splurge > alternative cuisine
    let slot4Place: Place | null = null
    let slot4Label = 'Alternative'

    if (signal.dietaryCuisine) {
      slot4Place = await findSlotCandidate(coords, signal.dietaryCuisine, signal.commonPriceLevels, usedIds)
      slot4Label = 'Dietary pick'
    }
    if (!slot4Place && signal.hasHigherBudget) {
      slot4Place = await findSlotCandidate(coords, slot1Cuisine, signal.maxPriceLevels, usedIds)
      slot4Label = 'Splurge'
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

    // Dedup guard: if the same place appears in two slots (can happen when
    // multiple cuisine labels map to the same Google type), drop the duplicate
    // and replace it with a broad fallback so we always present distinct options.
    const seenIds = new Set<string>(rawCandidates.map((c) => c.place.id))
    const dedupedCandidates = rawCandidates.filter((c, i) => {
      const firstIdx = rawCandidates.findIndex((x) => x.place.id === c.place.id)
      return firstIdx === i
    })

    if (dedupedCandidates.length < rawCandidates.length) {
      const broadPool = await searchNearbyRestaurants({
        ...coords,
        priceLevels: signal.commonPriceLevels,
        includedTypes: ['restaurant'],
      })
      const spares = broadPool
        .filter((p) => !seenIds.has(p.id) && p.rating > 0)
        .sort((a, b) => scorePlace(b) - scorePlace(a))

      for (const spare of spares) {
        if (dedupedCandidates.length >= rawCandidates.length) break
        const slot = (dedupedCandidates.length + 1) as 1 | 2 | 3 | 4
        dedupedCandidates.push({ place: spare, slot, slotLabel: 'Alternative' })
        seenIds.add(spare.id)
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
