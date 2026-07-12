import { createServerFn } from '@tanstack/react-start'
import { requireUser, supabaseServer } from '#/lib/supabase.server'

export const searchUsers = createServerFn()
  .inputValidator((d: { query: string }) => d)
  .handler(async ({ data }) => {
    const user = await requireUser()

    // Strip characters that have meaning in PostgREST .or() filters so a
    // search term can't break out of the pattern below.
    const query = data.query.replace(/[,()%]/g, '').trim()
    if (query.length < 2) return []

    const { data: users } = await supabaseServer
      .from('users')
      .select('id, display_name, email')
      .neq('id', user.id)
      .or(`display_name.ilike.%${query}%,email.ilike.%${query}%`)
      .limit(10)

    return users ?? []
  })
