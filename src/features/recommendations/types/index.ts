import type { Tables } from '#/types/database'
import type { Place } from '../lib/googlePlaces'

export type Recommendation = Tables<'recommendations'>

export interface Candidate {
  slot: 1 | 2 | 3 | 4
  slotLabel: string  // "Top pick" | "Runner up" | "For everyone" | "Dietary pick" | "Splurge" | "Alternative"
  place: Place
}
