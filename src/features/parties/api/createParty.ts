import { createServerFn } from '@tanstack/react-start'
import { requireUser, supabaseServer } from '#/lib/supabase.server'

export const createParty = createServerFn()
  .inputValidator((d: { name?: string; location: string }) => d)
  .handler(async ({ data }) => {
    const user = await requireUser()
    const { data: party, error } = await supabaseServer
      .from('parties')
      .insert({
        name: data.name || null,
        location: data.location,
        creator_id: user.id,
        status: 'open',
        invite_token: crypto.randomUUID(),
      })
      .select()
      .single()

    if (error) throw new Error(error.message)
    return party
  })
