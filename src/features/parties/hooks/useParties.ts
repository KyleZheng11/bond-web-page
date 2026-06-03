import { useEffect, useState } from 'react'
import { supabase } from '#/lib/supabase'
import type { Party } from '#/features/parties'

export function useParties(userId: string | undefined) {
  const [parties, setParties] = useState<Party[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return

    supabase
      .from('parties')
      .select('*')
      .eq('creator_id', userId)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setParties(data ?? [])
        setLoading(false)
      })
  }, [userId])

  return { parties, loading }
}
