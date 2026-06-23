import type { Preference } from '#/features/preferences'
import { tiersToGooglePriceLevels } from './googlePlaces'

export interface AggregatedSignal {
  rankedCuisines: string[]       // cuisine labels sorted by vote frequency (most wanted first)
  minorityCuisine: string | null // least-requested unique cuisine for the "for everyone" slot
  dietaryCuisines: string[]      // cuisines that accommodate group dietary needs, best options first
  commonBudget: number           // lowest tier — affordable for everyone
  maxBudget: number              // highest tier — for the splurge slot
  commonPriceLevels: string[]    // google price levels up to commonBudget
  maxPriceLevels: string[]       // google price levels up to maxBudget
  hasHigherBudget: boolean       // true when maxBudget > commonBudget
  dietaryRestrictions: string[]
  needsVegan: boolean
  needsVegetarian: boolean
  memberCount: number
}

// Cuisines that statistically accommodate each dietary restriction well.
// Used to pick a "safe" slot-4 option when the group has restrictions.
const DIETARY_FRIENDLY: Record<string, string[]> = {
  'Vegan':        ['Indian', 'Ethiopian', 'Vietnamese', 'Mediterranean', 'Middle Eastern'],
  'Vegetarian':   ['Indian', 'Italian', 'Mediterranean', 'Greek', 'Japanese'],
  'Halal':        ['Middle Eastern', 'Turkish', 'Lebanese', 'Mediterranean'],
  'Kosher':       ['Mediterranean', 'Middle Eastern'],
  'Gluten-free':  ['Mexican', 'Indian', 'Mediterranean', 'Japanese'],
  'Dairy-free':   ['Japanese', 'Vietnamese', 'Thai', 'Ethiopian'],
}

export function aggregatePreferences(preferences: Preference[], cuisineBlacklist: string[] = []): AggregatedSignal {
  if (preferences.length === 0) throw new Error('No preferences to aggregate')
  const blacklistSet = new Set(cuisineBlacklist)

  // Cuisines: count how many members want each cuisine
  const cuisineCounts = new Map<string, number>()
  for (const p of preferences) {
    for (const c of p.cuisine_preferences ?? []) {
      cuisineCounts.set(c, (cuisineCounts.get(c) ?? 0) + 1)
    }
  }

  // Sort by frequency descending, then alphabetically; exclude blacklisted cuisines
  const rankedCuisines = [...cuisineCounts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([cuisine]) => cuisine)
    .filter((c) => !blacklistSet.has(c))

  // The minority cuisine is the one requested by the fewest members (last in the ranked list)
  // Only meaningful when there are at least 2 unique cuisines
  const minorityCuisine = rankedCuisines.length >= 2
    ? rankedCuisines[rankedCuisines.length - 1]
    : null

  // Budget: lowest tier = everyone can afford it; highest tier = splurge option
  const tiers = preferences.map((p) => p.budget_tier ?? 2)
  const commonBudget = Math.min(...tiers)
  const maxBudget = Math.max(...tiers)

  // Dietary: union of all restrictions
  const allRestrictions = preferences.flatMap((p) => p.dietary_restrictions ?? [])
  const dietaryRestrictions = [...new Set(allRestrictions)]

  const needsVegan = dietaryRestrictions.some((r) => r.toLowerCase() === 'vegan')
  const needsVegetarian = !needsVegan && dietaryRestrictions.some((r) => r.toLowerCase() === 'vegetarian')

  // Collect all dietary-friendly cuisines across all restrictions.
  // Novel options (not already in the top 3) come first so findRestaurant
  // searches them first and naturally finds variety based on what's nearby.
  const topThree = new Set(rankedCuisines.slice(0, 3))
  const dietaryCuisines: string[] = []

  if (dietaryRestrictions.length > 0) {
    const seen = new Set<string>()
    // Novel cuisines first
    for (const restriction of dietaryRestrictions) {
      for (const c of DIETARY_FRIENDLY[restriction] ?? []) {
        if (!seen.has(c) && !topThree.has(c)) { seen.add(c); dietaryCuisines.push(c) }
      }
    }
    // Fallback: add overlapping cuisines so there's always something to try
    for (const restriction of dietaryRestrictions) {
      for (const c of DIETARY_FRIENDLY[restriction] ?? []) {
        if (!seen.has(c)) { seen.add(c); dietaryCuisines.push(c) }
      }
    }
  }

  return {
    rankedCuisines,
    minorityCuisine,
    dietaryCuisines,
    commonBudget,
    maxBudget,
    commonPriceLevels: tiersToGooglePriceLevels(commonBudget),
    maxPriceLevels: tiersToGooglePriceLevels(maxBudget),
    hasHigherBudget: maxBudget > commonBudget,
    dietaryRestrictions,
    needsVegan,
    needsVegetarian,
    memberCount: preferences.length,
  }
}
