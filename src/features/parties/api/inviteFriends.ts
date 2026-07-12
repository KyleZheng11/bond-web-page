import { createServerFn } from '@tanstack/react-start'
import { requireUser, supabaseServer } from '#/lib/supabase.server'

export const inviteFriends = createServerFn()
  .inputValidator((d: { partyId: string; friendUserIds: string[] }) => d)
  .handler(async ({ data }) => {
    const user = await requireUser()
    const { partyId, friendUserIds } = data
    if (friendUserIds.length === 0) return { ok: true }

    const { data: party } = await supabaseServer
      .from('parties').select('creator_id').eq('id', partyId).single()
    if (!party) throw new Error('Party not found')
    if (party.creator_id !== user.id) throw new Error('Only the creator can invite friends.')

    const { data: users } = await supabaseServer
      .from('users')
      .select('id, display_name, email')
      .in('id', friendUserIds)

    const members = (users ?? []).map((u) => ({
      party_id: partyId,
      user_id: u.id,
      guest_name: u.display_name ?? u.email.split('@')[0],
    }))

    const { error } = await supabaseServer.from('party_members').insert(members)
    if (error) throw new Error(error.message)

    return { ok: true }
  })
