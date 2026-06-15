import { createServerFn } from '@tanstack/react-start'
import { supabaseServer } from '#/lib/supabase.server'

export const respondToFriendRequest = createServerFn()
  .inputValidator((d: { friendshipId: string; accept: boolean }) => d)
  .handler(async ({ data }) => {
    const status = data.accept ? 'accepted' : 'declined'

    const { error } = await supabaseServer
      .from('friendships')
      .update({ status })
      .eq('id', data.friendshipId)

    if (error) throw new Error(error.message)
    return { ok: true }
  })
