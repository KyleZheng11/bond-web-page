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
    return party
  })
