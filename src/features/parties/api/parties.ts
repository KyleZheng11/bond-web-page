import { createServerFn } from '@tanstack/react-start'
import { requireUser, supabaseServer } from '#/lib/supabase.server'

export const getMyParties = createServerFn().handler(async () => {
  const user = await requireUser()

  const [{ data: created }, { data: memberRows }] = await Promise.all([
    supabaseServer.from('parties').select('*').eq('creator_id', user.id),
    supabaseServer.from('party_members').select('party_id').eq('user_id', user.id),
  ])

  const createdIds = new Set((created ?? []).map((p) => p.id))
  const invitedIds = (memberRows ?? []).map((r) => r.party_id).filter((id) => !createdIds.has(id))

  let invited: typeof created = []
  if (invitedIds.length > 0) {
    const { data } = await supabaseServer.from('parties').select('*').in('id', invitedIds)
    invited = data ?? []
  }

  return [...(created ?? []), ...invited].sort(
    (a, b) => new Date(b.created_at!).getTime() - new Date(a.created_at!).getTime()
  )
})
