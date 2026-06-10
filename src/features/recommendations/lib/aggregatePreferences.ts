import type { Preference } from '#/features/preferences'
import { CUISINE_TO_GOOGLE_TYPE, tiersToGooglePriceLevels } from './googlePlaces'

export interface AggregatedSignal {
  vetoedGoogleTypes: string[]
  vetoedCuisineLabels: string[]
  budgetCeiling: number
  priceLevels: string[]
  dietaryRestrictions: string[]
  dominantVibe: string | null
  needsVegan: boolean
  needsVegetarian: boolean
  memberCount: number
}

export function aggregatePreferences(preferences: Preference[]): AggregatedSignal {
  if (preferences.length === 0) throw new Error('No preferences to aggregate')

  // Cuisines: union of all vetoes — anything any member rejected is off the table
  const allVetoes = preferences.flatMap((p) => p.cuisine_preferences ?? [])
  const vetoedCuisineLabels = [...new Set(allVetoes)]
  const vetoedGoogleTypes = vetoedCuisineLabels
    .map((c) => CUISINE_TO_GOOGLE_TYPE[c])
    .filter(Boolean) as string[]

  // Budget: most constrained member's tier is the ceiling (they can afford up to that tier)
  const tiers = preferences.map((p) => p.budget_tier ?? 2)
  const budgetCeiling = Math.min(...tiers)
  const priceLevels = tiersToGooglePriceLevels(budgetCeiling)

  // Dietary: union — every restriction must be respected
  const allRestrictions = preferences.flatMap((p) => p.dietary_restrictions ?? [])
  const dietaryRestrictions = [...new Set(allRestrictions)]

  // Vibe: most common value (mode)
  const vibeCounts = new Map<string, number>()
  for (const p of preferences) {
    if (p.vibe) vibeCounts.set(p.vibe, (vibeCounts.get(p.vibe) ?? 0) + 1)
  }
  let dominantVibe: string | null = null
  let maxCount = 0
  for (const [vibe, count] of vibeCounts) {
    if (count > maxCount) { dominantVibe = vibe; maxCount = count }
  }

  const needsVegan = dietaryRestrictions.some((r) => r.toLowerCase() === 'vegan')
  const needsVegetarian = !needsVegan && dietaryRestrictions.some((r) => r.toLowerCase() === 'vegetarian')

  return {
    vetoedGoogleTypes,
    vetoedCuisineLabels,
    budgetCeiling,
    priceLevels,
    dietaryRestrictions,
    dominantVibe,
    needsVegan,
    needsVegetarian,
    memberCount: preferences.length,
  }
}
