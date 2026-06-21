import { createServerFn } from '@tanstack/react-start'
import { supabaseServer } from '#/lib/supabase.server'

export const submitPreferences = createServerFn()
  .inputValidator((d: {
    partyId: string
    userId: string
    cuisineWants: string[]
    budgetTier: number
    dietaryRestrictions: string[]
  }) => d)
  .handler(async ({ data }) => {
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
          cuisine_preferences: data.cuisineWants,
          budget_tier: data.budgetTier,
          vibe: null,
          dietary_restrictions: merged,
        },
        { onConflict: 'party_id,user_id' },
      )

    if (error) throw new Error(error.message)
    return { ok: true }
  })
