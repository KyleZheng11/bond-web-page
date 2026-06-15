import { createServerFn } from '@tanstack/react-start'
import { supabaseServer } from '#/lib/supabase.server'

export const searchUsers = createServerFn()
  .inputValidator((d: { query: string; currentUserId: string }) => d)
  .handler(async ({ data }) => {
    const { query, currentUserId } = data
    if (query.trim().length < 2) return []

    const { data: users } = await supabaseServer
      .from('users')
      .select('id, display_name, email')
      .neq('id', currentUserId)
      .or(`display_name.ilike.%${query}%,email.ilike.%${query}%`)
      .limit(10)

    return users ?? []
  })
