import type { Preference } from '#/features/preferences'
import { CUISINE_TO_GOOGLE_TYPE, tiersToGooglePriceLevels } from './googlePlaces'

export interface AggregatedSignal {
  rankedCuisines: string[]       // cuisine labels sorted by vote frequency (most wanted first)
  minorityCuisine: string | null // least-requested unique cuisine for the "for everyone" slot
  dietaryCuisine: string | null  // cuisine that accommodates group dietary needs (flex slot)
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

export function aggregatePreferences(preferences: Preference[]): AggregatedSignal {
  if (preferences.length === 0) throw new Error('No preferences to aggregate')

  // Cuisines: count how many members want each cuisine
  const cuisineCounts = new Map<string, number>()
  for (const p of preferences) {
    for (const c of p.cuisine_preferences ?? []) {
      cuisineCounts.set(c, (cuisineCounts.get(c) ?? 0) + 1)
    }
  }

  // Sort by frequency descending, then alphabetically to keep ordering stable
  const rankedCuisines = [...cuisineCounts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([cuisine]) => cuisine)

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

  // Find a dietary-friendly cuisine that isn't already in the top 3 slots
  // so the flex slot adds genuine variety
  let dietaryCuisine: string | null = null
  const topThree = new Set(rankedCuisines.slice(0, 3))

  if (dietaryRestrictions.length > 0) {
    for (const restriction of dietaryRestrictions) {
      const candidates = DIETARY_FRIENDLY[restriction] ?? []
      const novel = candidates.find((c) => !topThree.has(c))
      if (novel) { dietaryCuisine = novel; break }
      // Fallback: use the first friendly cuisine even if it overlaps
      if (candidates[0]) { dietaryCuisine = candidates[0]; break }
    }
  }

  return {
    rankedCuisines,
    minorityCuisine,
    dietaryCuisine,
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
