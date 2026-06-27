import { createServerFn } from '@tanstack/react-start'
import { supabaseServer } from '#/lib/supabase.server'

export const createParty = createServerFn()
  .inputValidator((d: { name?: string; location: string; creatorId: string }) => d)
  .handler(async ({ data }) => {
    const { data: party, error } = await supabaseServer
      .from('parties')
      .insert({
        name: data.name || null,
        location: data.location,
        creator_id: data.creatorId,
        status: 'open',
        invite_token: crypto.randomUUID(),
      })
      .select()
      .single()

    if (error) throw new Error(error.message)

    const { data: profile } = await supabaseServer
      .from('users')
      .select('display_name, email')
      .eq('id', data.creatorId)
      .maybeSingle()

    await supabaseServer.from('party_members').insert({
      party_id: party.id,
      user_id: data.creatorId,
      guest_name: profile?.display_name || profile?.email?.split('@')[0] || 'Host',
      joined_at: new Date().toISOString(),
    })

    return party
  })
