import { createServerFn } from '@tanstack/react-start'
import { supabaseServer } from '#/lib/supabase.server'

export const submitGuestPreferences = createServerFn()
  .inputValidator((d: {
    token: string
    guestName: string
    cuisineWants: string[]
    budgetTier: number
    dietaryRestrictions: string[]
  }) => d)
  .handler(async ({ data }) => {
    // Try per-member guest token first
    const { data: member } = await supabaseServer
      .from('party_members')
      .select('id, party_id, preferences_submitted_at, expires_at')
      .eq('guest_token', data.token)
      .maybeSingle()

    if (member) {
      if (member.expires_at && new Date(member.expires_at) < new Date()) {
        throw new Error('This invite link has expired.')
      }

      // Upsert: update if preferences already exist, insert if not
      const { data: existing } = await supabaseServer
        .from('preferences')
        .select('party_id')
        .eq('party_id', member.party_id)
        .eq('guest_token', data.token)
        .maybeSingle()

      if (existing) {
        await supabaseServer
          .from('preferences')
          .update({
            cuisine_preferences: data.cuisineWants,
            budget_tier: data.budgetTier,
            dietary_restrictions: data.dietaryRestrictions,
          })
          .eq('party_id', member.party_id)
          .eq('guest_token', data.token)
      } else {
        const { error: prefError } = await supabaseServer
          .from('preferences')
          .insert({
            party_id: member.party_id,
            guest_token: data.token,
            cuisine_preferences: data.cuisineWants,
            budget_tier: data.budgetTier,
            vibe: null,
            dietary_restrictions: data.dietaryRestrictions,
          })
        if (prefError) throw new Error(prefError.message)
      }

      const memberUpdate: Record<string, string> = {
        preferences_submitted_at: new Date().toISOString(),
      }
      // Only overwrite the name if one was provided (editing from lobby skips name entry)
      if (data.guestName) memberUpdate.guest_name = data.guestName

      await supabaseServer
        .from('party_members')
        .update(memberUpdate)
        .eq('guest_token', data.token)

      return { ok: true, partyId: member.party_id }
    }

    // Try party-level general link token — create a new anonymous member row
    const { data: party } = await supabaseServer
      .from('parties')
      .select('id')
      .eq('invite_token', data.token)
      .maybeSingle()

    if (!party) throw new Error('Invalid invite link.')

    const guestToken = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString()

    const { error: memberError } = await supabaseServer
      .from('party_members')
      .insert({
        party_id: party.id,
        guest_token: guestToken,
        guest_name: data.guestName,
        expires_at: expiresAt,
        preferences_submitted_at: new Date().toISOString(),
      })
    if (memberError) throw new Error(memberError.message)

    const { error: prefError } = await supabaseServer
      .from('preferences')
      .insert({
        party_id: party.id,
        guest_token: guestToken,
        cuisine_preferences: data.cuisineWants,
        budget_tier: data.budgetTier,
        vibe: null,
        dietary_restrictions: data.dietaryRestrictions,
      })
    if (prefError) throw new Error(prefError.message)

    return { ok: true, partyId: party.id, guestToken }
  })
