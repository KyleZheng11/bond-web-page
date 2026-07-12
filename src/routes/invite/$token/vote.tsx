import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect, useCallback } from 'react'
import { Star, Check } from 'lucide-react'
import { getCandidates, submitVote } from '#/features/votes'
import { resolveInvite } from '#/features/invites'
import { supabase } from '#/lib/supabase'
import { getRecommendation } from '#/features/recommendations'
import type { Candidate } from '#/features/recommendations'
import { Wordmark } from '#/components/ui'

export const Route = createFileRoute('/invite/$token/vote')({ component: GuestVoteScreen })

const PRICE_SYMBOL: Record<string, string> = {
  PRICE_LEVEL_INEXPENSIVE: 'Under $15',
  PRICE_LEVEL_MODERATE: '$15–$30',
  PRICE_LEVEL_EXPENSIVE: '$30–$60',
  PRICE_LEVEL_VERY_EXPENSIVE: '$60+',
}

function GuestVoteScreen() {
  const { token } = Route.useParams()
  const navigate = useNavigate()

  const [partyId, setPartyId] = useState<string | null>(null)
  const [voterId, setVoterId] = useState<string | null>(null)
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [totalVoters, setTotalVoters] = useState(0)
  const [votesCast, setVotesCast] = useState(0)
  const [myVote, setMyVote] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Resolve the token to get partyId and the guest's voter id
  useEffect(() => {
    resolveInvite({ data: { token } })
      .then((result) => {
        if (result.party.status === 'resolved') {
          navigate({ to: '/invite/$token/results', params: { token } })
          return
        }
        setPartyId(result.party.id)
        if (result.tokenType === 'member') {
          // Per-member token (unique per guest) — safe to use as voterId
          setVoterId(token)
        } else {
          // Shared party link: every guest has the same URL token, so using it
          // as voterId would make their votes overwrite each other. Use the
          // personal token saved when they joined, or send them to join first.
          const saved = localStorage.getItem(`bond:guest:${result.party.id}`)
          if (saved) {
            setVoterId(saved)
          } else {
            navigate({ to: '/invite/$token', params: { token } })
          }
        }
      })
      .catch(() => setError('Invalid or expired invite link.'))
  }, [token, navigate])

  const loadCandidates = useCallback(async (pid: string) => {
    const result = await getCandidates({ data: { partyId: pid } })
    setCandidates(result.candidates)
    setTotalVoters(result.totalVoters)
    setVotesCast(result.votesCast)
  }, [])

  useEffect(() => {
    if (!partyId) return
    loadCandidates(partyId).finally(() => setLoading(false))
  }, [partyId, loadCandidates])

  // Poll every 2s so vote counts stay accurate even if a broadcast never
  // arrives — realtime delivery is less reliable for unauthenticated guests.
  useEffect(() => {
    if (!partyId) return
    const interval = setInterval(() => loadCandidates(partyId), 2000)
    return () => clearInterval(interval)
  }, [partyId, loadCandidates])

  // Once this guest has voted, also poll for the final result as a
  // guaranteed fallback in case the result_locked broadcast doesn't arrive.
  useEffect(() => {
    if (!partyId || !myVote) return
    const interval = setInterval(async () => {
      try {
        const rec = await getRecommendation({ data: { partyId } })
        if (rec.restaurant_id !== 'pending') {
          navigate({ to: '/invite/$token/results', params: { token } })
        }
      } catch { /* not ready yet */ }
    }, 3000)
    return () => clearInterval(interval)
  }, [partyId, myVote, navigate, token])

  // Real-time: refresh when votes come in or party resolves. Same channel
  // name (`vote:{partyId}`) the leader and every guest broadcast on — using
  // a different name here meant this guest never heard other guests' votes.
  useEffect(() => {
    if (!partyId) return
    const channel = supabase
      .channel(`vote:${partyId}`)
      .on('broadcast', { event: 'vote_cast' }, () => loadCandidates(partyId))
      .on('broadcast', { event: 'result_locked' }, () => {
        navigate({ to: '/invite/$token/results', params: { token } })
      })
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'parties' },
        (payload) => {
          if ((payload.new as { id?: string }).id === partyId &&
              (payload.new as { status?: string }).status === 'resolved') {
            navigate({ to: '/invite/$token/results', params: { token } })
          }
        })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [partyId, loadCandidates, navigate, token])

  async function handleVote(restaurantId: string) {
    if (!partyId || !voterId) return
    setMyVote(restaurantId)
    await submitVote({ data: { partyId, restaurantId, guestToken: voterId } })
    const ch = supabase.channel(`vote:${partyId}`)
    await ch.send({ type: 'broadcast', event: 'vote_cast', payload: {} })
    supabase.removeChannel(ch)
    await loadCandidates(partyId)
  }

  if (error) {
    return (
      <div className="min-h-dvh flex items-center justify-center px-6 text-center">
        <p className="text-sm" style={{ color: 'var(--color-ink-soft)' }}>{error}</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-dvh flex flex-col">
        <main className="flex-1 px-6 py-8 max-w-lg md:max-w-285 mx-auto w-full">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 rounded-[20px] animate-pulse" style={{ background: 'var(--color-surface)' }} />
            ))}
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-dvh flex flex-col">
      <header className="max-w-lg md:max-w-285 mx-auto w-full px-6 py-4">
        <Wordmark className="text-xl" />
      </header>

      <main className="flex-1 px-6 pb-10 max-w-lg md:max-w-285 mx-auto w-full flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <h1 className="display text-3xl">Vote for your pick.</h1>
          <p className="text-sm" style={{ color: 'var(--color-ink-soft)' }}>
            {myVote
              ? `${votesCast} of ${totalVoters} voted — waiting for the group to lock in.`
              : 'Pick the one you want most.'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {candidates.map((c) => {
            const { place, slotLabel } = c
            const price = PRICE_SYMBOL[place.priceLevel] ?? ''
            const selected = myVote === place.id

            return (
              <div
                key={place.id}
                className="card flex flex-col overflow-hidden transition-colors"
                style={selected ? { borderColor: 'var(--color-bond)', borderWidth: '1.5px' } : undefined}
              >
                {place.photoUrl && (
                  <div className="relative h-40 overflow-hidden">
                    <img src={place.photoUrl} alt={place.name} loading="lazy" className="w-full h-full object-cover" />
                    <div
                      className="absolute inset-0"
                      style={{ background: 'linear-gradient(to top, rgba(11,39,64,0.6) 0%, transparent 55%)' }}
                    />
                    <span
                      className="absolute bottom-3 left-3 text-xs font-bold uppercase tracking-widest px-2.5 py-1 rounded-full"
                      style={{ background: 'rgba(11,39,64,0.65)', color: '#ffffff' }}
                    >
                      {slotLabel}
                    </span>
                  </div>
                )}

                <div className="flex flex-col gap-3 px-5 py-4">
                  {!place.photoUrl && <span className="eyebrow">{slotLabel}</span>}
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-display text-lg font-bold leading-tight">{place.name}</h3>
                    {price && (
                      <span className="shrink-0 text-sm font-bold mt-0.5" style={{ color: 'var(--color-blueberry)' }}>
                        {price}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    {place.rating > 0 && (
                      <span className="flex items-center gap-1 text-sm font-medium" style={{ color: 'var(--color-ink-soft)' }}>
                        <Star size={14} fill="var(--color-sunrise)" color="var(--color-sunrise)" aria-hidden />
                        {place.rating}
                        {place.reviewCount > 0 && <span className="text-xs">({place.reviewCount.toLocaleString()})</span>}
                      </span>
                    )}
                    {place.address && (
                      <span className="text-xs truncate" style={{ color: 'var(--color-ink-soft)' }}>{place.address}</span>
                    )}
                  </div>

                  <button
                    onClick={() => handleVote(place.id)}
                    disabled={selected}
                    className={`btn w-full py-3 !rounded-xl text-sm disabled:cursor-default ${selected ? 'btn-dark' : 'btn-secondary'}`}
                    style={myVote && !selected ? { opacity: 0.7 } : undefined}
                  >
                    {selected && <Check size={15} aria-hidden />}
                    {selected ? 'Your pick' : 'Vote for this'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {myVote && (
          <div className="card px-4 py-4 text-sm text-center md:max-w-sm md:mx-auto" style={{ color: 'var(--color-ink-soft)' }}>
            Vote's in — you can still change your pick until the leader locks in the result.
          </div>
        )}
      </main>
    </div>
  )
}
