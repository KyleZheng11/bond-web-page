import { createServerFn } from '@tanstack/react-start'
import { supabaseServer } from '#/lib/supabase.server'

export const getInviterInfo = createServerFn()
  .inputValidator((d: { token: string }) => d)
  .handler(async ({ data }) => {
    const { data: invite } = await supabaseServer
      .from('friend_invites')
      .select('inviter_id, expires_at')
      .eq('token', data.token)
      .maybeSingle()

    if (!invite) throw new Error('Invite link is invalid.')
    if (new Date(invite.expires_at) < new Date()) throw new Error('This invite link has expired.')

    const { data: inviter } = await supabaseServer
      .from('users')
      .select('display_name, email')
      .eq('id', invite.inviter_id)
      .single()

    const name = inviter?.display_name ?? inviter?.email.split('@')[0] ?? 'Someone'
    return { name, inviterId: invite.inviter_id }
  })
