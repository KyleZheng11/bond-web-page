import { createServerFn } from '@tanstack/react-start'
import { supabaseServer } from '#/lib/supabase.server'

export const submitPreferences = createServerFn()
  .inputValidator((d: {
    partyId: string
    userId: string
    // Stored as cuisine_preferences — interpreted as vetoes by the recommendation engine
    cuisineVetoes: string[]
    budgetTier: number
    vibe: string | null
    dietaryRestrictions: string[]
  }) => d)
  .handler(async ({ data }) => {
    // Merge form dietary restrictions with any saved on the user's profile
    const { data: profile } = await supabaseServer
      .from('users')
      .select('dietary_restrictions')
      .eq('id', data.userId)
      .maybeSingle()

    const profileRestrictions = profile?.dietary_restrictions ?? []
    const merged = Array.from(new Set([...profileRestrictions, ...data.dietaryRestrictions]))

    const { error } = await supabaseServer
      .from('preferences')
      .upsert(
        {
          party_id: data.partyId,
          user_id: data.userId,
          cuisine_preferences: data.cuisineVetoes,
          budget_tier: data.budgetTier,
          vibe: data.vibe,
          dietary_restrictions: merged,
        },
        { onConflict: 'party_id,user_id' },
      )

    if (error) throw new Error(error.message)
    return { ok: true }
  })
