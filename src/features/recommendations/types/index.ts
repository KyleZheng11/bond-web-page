import type { Tables } from '#/types/database'
import type { Place } from '../lib/googlePlaces'

export type Recommendation = Tables<'recommendations'>

export interface Candidate {
  slot: 1 | 2 | 3
  slotLabel: string  // the cuisine searched for this candidate, e.g. "Italian" (or "Nearby" with no cuisine preference)
  place: Place
}
