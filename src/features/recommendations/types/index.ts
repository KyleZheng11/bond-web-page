import type { Tables, Json } from '#/types/database'

export type Recommendation = Tables<'recommendations'>

export interface RankedAlternative {
  restaurant_id: string
  restaurant_name: string
  restaurant_data: Json
  reason: string
  category: 'different_budget' | 'different_cuisine' | 'different_vibe'
}
