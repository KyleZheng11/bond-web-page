import { useEffect, useState } from 'react'
import { getMyParties } from '#/features/parties/api/parties'
import type { Party } from '#/features/parties'

export function useParties(userId: string | undefined) {
  const [parties, setParties] = useState<Party[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!userId) return

    setLoading(true)
    getMyParties({ data: { userId } })
      .then((data) => setParties(data))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [userId])

  return { parties, loading, error }
}
