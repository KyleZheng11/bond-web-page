import { createServerFn } from '@tanstack/react-start'
import { supabaseServer } from '#/lib/supabase.server'
import type { FriendRequest } from '../types'

export const getFriendRequests = createServerFn()
  .inputValidator((d: { userId: string }) => d)
  .handler(async ({ data }): Promise<FriendRequest[]> => {
    const { userId } = data

    const { data: rows } = await supabaseServer
      .from('friendships')
      .select('id, requester_id, created_at')
      .eq('addressee_id', userId)
      .eq('status', 'pending')

    if (!rows?.length) return []

    const requesterIds = rows.map((r) => r.requester_id)

    const { data: users } = await supabaseServer
      .from('users')
      .select('id, display_name, email')
      .in('id', requesterIds)

    return rows.map((r) => {
      const user = users?.find((u) => u.id === r.requester_id)
      return {
        friendshipId: r.id,
        requesterId: r.requester_id,
        displayName: user?.display_name ?? null,
        email: user?.email ?? '',
        createdAt: r.created_at,
      }
    })
  })
