import { createServerFn } from '@tanstack/react-start'
import { requireUser, supabaseServer } from '#/lib/supabase.server'

export const deleteParty = createServerFn()
  .inputValidator((d: { partyId: string }) => d)
  .handler(async ({ data }) => {
    const user = await requireUser()
    const { partyId } = data

    const { data: party, error } = await supabaseServer
      .from('parties').select('creator_id').eq('id', partyId).single()
    if (error) throw new Error('Party not found')
    if (party.creator_id !== user.id) throw new Error('Only the creator can delete this party')

    // Delete in dependency order to avoid FK violations
    await supabaseServer.from('votes').delete().eq('party_id', partyId)
    await supabaseServer.from('preferences').delete().eq('party_id', partyId)
    await supabaseServer.from('recommendations').delete().eq('party_id', partyId)
    await supabaseServer.from('party_members').delete().eq('party_id', partyId)
    await supabaseServer.from('parties').delete().eq('id', partyId)
  })
