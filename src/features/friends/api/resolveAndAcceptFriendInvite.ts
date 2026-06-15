import { createServerFn } from '@tanstack/react-start'
import { supabaseServer } from '#/lib/supabase.server'

export const resolveAndAcceptFriendInvite = createServerFn()
  .inputValidator((d: { token: string; acceptorId: string }) => d)
  .handler(async ({ data }) => {
    const { token, acceptorId } = data

    const { data: invite } = await supabaseServer
      .from('friend_invites')
      .select('id, inviter_id, expires_at')
      .eq('token', token)
      .maybeSingle()

    if (!invite) throw new Error('Invite link is invalid.')
    if (new Date(invite.expires_at) < new Date()) throw new Error('This invite link has expired.')
    if (invite.inviter_id === acceptorId) throw new Error('This is your own invite link.')

    // Check if already connected in either direction
    const { data: existing } = await supabaseServer
      .from('friendships')
      .select('id, status')
      .or(
        `and(requester_id.eq.${invite.inviter_id},addressee_id.eq.${acceptorId}),and(requester_id.eq.${acceptorId},addressee_id.eq.${invite.inviter_id})`
      )
      .maybeSingle()

    if (existing?.status === 'accepted') return { ok: true, alreadyFriends: true }

    if (existing) {
      // Upgrade any pending/declined row to accepted
      await supabaseServer
        .from('friendships')
        .update({ status: 'accepted' })
        .eq('id', existing.id)
    } else {
      // Create a new accepted friendship directly (invite = implicit mutual consent)
      await supabaseServer
        .from('friendships')
        .insert({ requester_id: invite.inviter_id, addressee_id: acceptorId, status: 'accepted' })
    }

    // Fetch inviter name so the UI can confirm who was added
    const { data: inviter } = await supabaseServer
      .from('users')
      .select('display_name, email')
      .eq('id', invite.inviter_id)
      .single()

    const inviterName = inviter?.display_name ?? inviter?.email?.split('@')[0] ?? 'Your friend'
    return { ok: true, alreadyFriends: false, inviterName }
  })
