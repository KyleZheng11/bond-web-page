import { createServerFn } from '@tanstack/react-start'
import { supabaseServer } from '#/lib/supabase.server'

export const sendFriendRequest = createServerFn()
  .inputValidator((d: { requesterId: string; addresseeId: string }) => d)
  .handler(async ({ data }) => {
    const { requesterId, addresseeId } = data

    if (requesterId === addresseeId) throw new Error('Cannot add yourself.')

    // Check for any existing relationship in either direction
    const { data: existing } = await supabaseServer
      .from('friendships')
      .select('id, status')
      .or(
        `and(requester_id.eq.${requesterId},addressee_id.eq.${addresseeId}),and(requester_id.eq.${addresseeId},addressee_id.eq.${requesterId})`
      )
      .maybeSingle()

    if (existing) {
      if (existing.status === 'accepted') throw new Error('Already friends.')
      if (existing.status === 'pending') throw new Error('Request already sent.')
    }

    const { error } = await supabaseServer
      .from('friendships')
      .insert({ requester_id: requesterId, addressee_id: addresseeId })

    if (error) throw new Error(error.message)
    return { ok: true }
  })
