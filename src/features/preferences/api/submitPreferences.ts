import { createServerFn } from '@tanstack/react-start'
import { requireUser, supabaseServer } from '#/lib/supabase.server'

export const submitPreferences = createServerFn()
  .inputValidator((d: {
    partyId: string
    cuisineWants: string[]
    budgetTier: number
    dietaryRestrictions: string[]
  }) => d)
  .handler(async ({ data }) => {
    const user = await requireUser()

    // Only the creator or an invited member can add preferences to a party
    const [{ data: party }, { data: member }] = await Promise.all([
      supabaseServer.from('parties').select('creator_id').eq('id', data.partyId).single(),
      supabaseServer
        .from('party_members')
        .select('id')
        .eq('party_id', data.partyId)
        .eq('user_id', user.id)
        .maybeSingle(),
    ])
    if (party?.creator_id !== user.id && !member) {
      throw new Error('You are not part of this party.')
    }

    const { data: profile } = await supabaseServer
      .from('users')
      .select('dietary_restrictions')
      .eq('id', user.id)
      .maybeSingle()

    const profileRestrictions = profile?.dietary_restrictions ?? []
    const merged = Array.from(new Set([...profileRestrictions, ...data.dietaryRestrictions]))

    const { error } = await supabaseServer
      .from('preferences')
      .upsert(
        {
          party_id: data.partyId,
          user_id: user.id,
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
