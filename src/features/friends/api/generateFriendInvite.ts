import { createServerFn } from '@tanstack/react-start'
import { requireUser, supabaseServer } from '#/lib/supabase.server'

export const generateFriendInvite = createServerFn().handler(async () => {
  const user = await requireUser()

  // Reuse an existing unexpired token for this user
  const { data: existing } = await supabaseServer
    .from('friend_invites')
    .select('token')
    .eq('inviter_id', user.id)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existing) return { token: existing.token }

  const { data: created, error } = await supabaseServer
    .from('friend_invites')
    .insert({ inviter_id: user.id })
    .select('token')
    .single()

  if (error) throw new Error(error.message)
  return { token: created.token }
})
