import { createServerFn } from '@tanstack/react-start'
import { requireUser, supabaseServer } from '#/lib/supabase.server'

export const respondToFriendRequest = createServerFn()
  .inputValidator((d: { friendshipId: string; accept: boolean }) => d)
  .handler(async ({ data }) => {
    const user = await requireUser()

    // Only the person the request was sent to can accept or decline it
    const { data: friendship } = await supabaseServer
      .from('friendships')
      .select('addressee_id')
      .eq('id', data.friendshipId)
      .maybeSingle()
    if (!friendship) throw new Error('Request not found.')
    if (friendship.addressee_id !== user.id) throw new Error('This request is not for you.')

    const status = data.accept ? 'accepted' : 'declined'

    const { error } = await supabaseServer
      .from('friendships')
      .update({ status })
      .eq('id', data.friendshipId)

    if (error) throw new Error(error.message)
    return { ok: true }
  })
