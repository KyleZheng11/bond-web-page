import { createServerFn } from '@tanstack/react-start'
import { requireUser, supabaseServer } from '#/lib/supabase.server'
import type { Friend } from '../types'

export const getFriends = createServerFn().handler(async (): Promise<Friend[]> => {
  const { id: userId } = await requireUser()

  const { data: rows } = await supabaseServer
    .from('friendships')
    .select('id, requester_id, addressee_id')
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
    .eq('status', 'accepted')

  if (!rows?.length) return []

  const otherIds = rows.map((r) =>
    r.requester_id === userId ? r.addressee_id : r.requester_id
  )

  const { data: users } = await supabaseServer
    .from('users')
    .select('id, display_name, email')
    .in('id', otherIds)

  return rows.map((r) => {
    const otherId = r.requester_id === userId ? r.addressee_id : r.requester_id
    const user = users?.find((u) => u.id === otherId)
    return {
      friendshipId: r.id,
      userId: otherId,
      displayName: user?.display_name ?? null,
      email: user?.email ?? '',
    }
  })
})
