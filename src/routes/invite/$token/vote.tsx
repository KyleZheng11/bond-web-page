import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect, useCallback } from 'react'
import { getCandidates, submitVote } from '#/features/votes'
import { resolveInvite } from '#/features/invites'
import { supabase } from '#/lib/supabase'
import type { Candidate } from '#/features/recommendations'

export const Route = createFileRoute('/invite/$token/vote')({ component: GuestVoteScreen })

const PRICE_SYMBOL: Record<string, string> = {
  PRICE_LEVEL_INEXPENSIVE: '$',
  PRICE_LEVEL_MODERATE: '$$',
  PRICE_LEVEL_EXPENSIVE: '$$$',
  PRICE_LEVEL_VERY_EXPENSIVE: '$$$$',
}

function GuestVoteScreen() {
  const { token } = Route.useParams()
  const navigate = useNavigate()

  const [partyId, setPartyId] = useState<string | null>(null)
  const [voterId, setVoterId] = useState<string | null>(null)
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [voteCounts, setVoteCounts] = useState<Record<string, number>>({})
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
          navigate({ to: '/party/$partyId/results', params: { partyId: result.party.id } })
          return
        }
        setPartyId(result.party.id)
        // Use token as voterId for guests — it's unique per member
        setVoterId(token)
      })
      .catch(() => setError('Invalid or expired invite link.'))
  }, [token, navigate])

  const loadCandidates = useCallback(async (pid: string) => {
    const result = await getCandidates({ data: { partyId: pid } })
    setCandidates(result.candidates)
    setVoteCounts(result.voteCounts)
    setTotalVoters(result.totalVoters)
    setVotesCast(result.votesCast)
  }, [])

  useEffect(() => {
    if (!partyId) return
    loadCandidates(partyId).finally(() => setLoading(false))
  }, [partyId, loadCandidates])

  // Real-time: refresh when votes come in or party resolves
  useEffect(() => {
    if (!partyId) return
    const channel = supabase
      .channel(`vote-guest:${partyId}`)
      .on('broadcast', { event: 'vote_cast' }, () => loadCandidates(partyId))
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'parties' },
        (payload) => {
          if ((payload.new as { id?: string }).id === partyId &&
              (payload.new as { status?: string }).status === 'resolved') {
            navigate({ to: '/party/$partyId/results', params: { partyId } })
          }
        })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [partyId, loadCandidates, navigate])

  async function handleVote(restaurantId: string) {
    if (!partyId || !voterId) return
    setMyVote(restaurantId)
    await submitVote({ data: { partyId, voterId, restaurantId } })
    const ch = supabase.channel(`vote:${partyId}`)
    await ch.send({ type: 'broadcast', event: 'vote_cast', payload: {} })
    supabase.removeChannel(ch)
    await loadCandidates(partyId)
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 text-center"
        style={{ background: 'var(--color-surface-deep)' }}>
        <p className="text-sm" style={{ color: 'var(--color-text-mist)' }}>{error}</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: 'var(--color-surface-deep)' }}>
        <main className="flex-1 px-6 py-8 max-w-lg mx-auto w-full flex flex-col gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-48 rounded-2xl animate-pulse" style={{ background: 'var(--color-surface-petrol)' }} />
          ))}
        </main>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'var(--color-surface-deep)', color: 'var(--color-text-cream)' }}
    >
      <header className="px-6 py-5">
        <span className="font-display text-xl font-semibold" style={{ color: 'var(--color-accent-gold)' }}>
          Bond
        </span>
      </header>

      <main className="flex-1 px-6 pb-10 max-w-lg mx-auto w-full flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-3xl font-semibold" style={{ color: 'var(--color-text-cream)' }}>
            Vote for your pick.
          </h1>
          <p className="text-sm" style={{ color: 'var(--color-text-mist)' }}>
            {myVote
              ? `${votesCast} of ${totalVoters} voted — waiting for the group to lock in.`
              : 'Pick the one you want most.'}
          </p>
        </div>

        {candidates.map((c) => {
          const { place, slotLabel } = c
          const price = PRICE_SYMBOL[place.priceLevel] ?? ''
          const selected = myVote === place.id
          const voteCount = voteCounts[place.id] ?? 0
          const pct = votesCast > 0 ? Math.round((voteCount / votesCast) * 100) : 0

          return (
            <div
              key={place.id}
              className="flex flex-col rounded-2xl overflow-hidden transition-all"
              style={{
                background: 'var(--color-surface-petrol)',
                border: `1px solid ${selected ? 'var(--color-accent-ember)' : 'rgba(240,228,204,0.08)'}`,
              }}
            >
              {place.photoUrl && (
                <div className="relative h-36 overflow-hidden">
                  <img src={place.photoUrl} alt={place.name} className="w-full h-full object-cover" />
                  <div className="absolute inset-0"
                    style={{ background: 'linear-gradient(to top, rgba(19,61,92,0.7) 0%, transparent 60%)' }} />
                  <span className="absolute bottom-3 left-3 text-xs font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(11,31,45,0.6)', color: 'var(--color-text-mist)' }}>
                    {slotLabel}
                  </span>
                </div>
              )}

              <div className="flex flex-col gap-3 px-4 py-4">
                {!place.photoUrl && (
                  <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-mist)' }}>
                    {slotLabel}
                  </span>
                )}
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-display text-lg font-semibold leading-tight" style={{ color: 'var(--color-text-cream)' }}>
                    {place.name}
                  </h3>
                  {price && (
                    <span className="shrink-0 text-sm font-bold mt-0.5" style={{ color: 'var(--color-accent-gold)' }}>
                      {price}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  {place.rating > 0 && (
                    <span className="flex items-center gap-1 text-sm" style={{ color: 'var(--color-text-mist)' }}>
                      <span style={{ color: 'var(--color-accent-gold)' }}>★</span>
                      {place.rating}
                      {place.reviewCount > 0 && <span className="text-xs">({place.reviewCount.toLocaleString()})</span>}
                    </span>
                  )}
                  {place.address && (
                    <span className="text-xs truncate" style={{ color: 'var(--color-text-mist)' }}>{place.address}</span>
                  )}
                </div>

                {myVote && (
                  <div className="flex flex-col gap-1.5">
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--color-surface-twilight)' }}>
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${pct}%`, background: 'var(--color-accent-ember)' }} />
                    </div>
                    <p className="text-xs" style={{ color: 'var(--color-text-mist)' }}>
                      {voteCount} vote{voteCount !== 1 ? 's' : ''} · {pct}%
                    </p>
                  </div>
                )}

                <button
                  onClick={() => handleVote(place.id)}
                  disabled={!!myVote}
                  className="w-full py-3 rounded-xl font-semibold text-sm transition-all disabled:cursor-default"
                  style={{
                    background: selected ? 'var(--color-accent-ember)' : 'var(--color-surface-twilight)',
                    color: selected ? 'var(--color-on-ember)' : 'var(--color-text-cream)',
                    opacity: myVote && !selected ? 0.5 : 1,
                  }}
                >
                  {selected ? '✓ Your pick' : 'Vote for this'}
                </button>
              </div>
            </div>
          )
        })}

        {myVote && (
          <div
            className="px-4 py-4 rounded-2xl text-sm text-center"
            style={{ background: 'var(--color-surface-petrol)', color: 'var(--color-text-mist)' }}
          >
            You're locked in. The group leader will reveal the result.
          </div>
        )}
      </main>
    </div>
  )
}
