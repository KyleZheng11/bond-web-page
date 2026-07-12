import { useCallback, useEffect, useState } from 'react'
import { getMyParties } from '#/features/parties/api/parties'
import type { Party } from '#/features/parties'

export function useParties() {
  const [parties, setParties] = useState<Party[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const refresh = useCallback(() => {
    setLoading(true)
    getMyParties()
      .then((data) => setParties(data))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { refresh() }, [refresh])

  return { parties, loading, error, refresh }
}
