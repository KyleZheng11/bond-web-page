import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '#/features/auth'
import { finalizeVoting } from '#/features/votes'
import { getCandidates, submitVote } from '#/features/votes'
import { PartyProgressBar } from '#/features/parties'
import { supabase } from '#/lib/supabase'
import type { Candidate } from '#/features/recommendations'

export const Route = createFileRoute('/_auth/party/$partyId/vote')({ component: VoteScreen })

const PRICE_SYMBOL: Record<string, string> = {
  PRICE_LEVEL_INEXPENSIVE: '$',
  PRICE_LEVEL_MODERATE: '$$',
  PRICE_LEVEL_EXPENSIVE: '$$$',
  PRICE_LEVEL_VERY_EXPENSIVE: '$$$$',
}

function CandidateCard({
  candidate,
  selected,
  onVote,
  voteCount,
  totalVotes,
  revealed,
}: {
  candidate: Candidate
  selected: boolean
  onVote: () => void
  voteCount: number
  totalVotes: number
  revealed: boolean
}) {
  const { place, slotLabel } = candidate
  const price = PRICE_SYMBOL[place.priceLevel] ?? ''
  const pct = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0

  return (
    <div
      className="flex flex-col rounded-2xl overflow-hidden transition-all"
      style={{
        background: 'var(--color-surface-petrol)',
        border: `1px solid ${selected ? 'var(--color-accent-ember)' : 'var(--color-hairline)'}`,
      }}
    >
      {/* Photo */}
      {place.photoUrl && (
        <div className="relative h-36 overflow-hidden">
          <img src={place.photoUrl} alt={place.name} className="w-full h-full object-cover" />
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(to top, rgba(33,27,22,0.55) 0%, transparent 60%)' }}
          />
          <span
            className="absolute bottom-3 left-3 text-xs font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(33,27,22,0.55)', color: '#fff' }}
          >
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
              <span style={{ color: 'var(--color-accent-ember)' }}>★</span>
              {place.rating}
              {place.reviewCount > 0 && (
                <span className="text-xs">({place.reviewCount.toLocaleString()})</span>
              )}
            </span>
          )}
          {place.address && (
            <span className="text-xs truncate" style={{ color: 'var(--color-text-mist)' }}>
              {place.address}
            </span>
          )}
        </div>

        {/* Vote bar — only shown after voting */}
        {revealed && (
          <div className="flex flex-col gap-1.5">
            <div
              className="h-1.5 rounded-full overflow-hidden"
              style={{ background: 'var(--color-surface-twilight)' }}
            >
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${pct}%`, background: 'var(--color-accent-ember)' }}
              />
            </div>
            <p className="text-xs" style={{ color: 'var(--color-text-mist)' }}>
              {voteCount} vote{voteCount !== 1 ? 's' : ''} · {pct}%
            </p>
          </div>
        )}

        <button
          onClick={onVote}
          className="w-full py-3 rounded-xl font-semibold text-sm transition-all"
          style={{
            background: selected ? 'var(--color-accent-ember)' : 'var(--color-surface-twilight)',
            color: selected ? 'var(--color-on-ember)' : 'var(--color-text-cream)',
          }}
        >
          {selected ? '✓ Your pick' : 'Vote for this'}
        </button>
      </div>
    </div>
  )
}

function VoteScreen() {
  const { partyId } = Route.useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [voteCounts, setVoteCounts] = useState<Record<string, number>>({})
  const [totalVoters, setTotalVoters] = useState(0)
  const [votesCast, setVotesCast] = useState(0)
  const [myVote, setMyVote] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [finalizing, setFinalizing] = useState(false)

  const voterId = user?.id ?? ''
  const allVoted = votesCast >= totalVoters && totalVoters > 0

  const load = useCallback(async () => {
    const result = await getCandidates({ data: { partyId } })
    setCandidates(result.candidates)
    setVoteCounts(result.voteCounts)
    setTotalVoters(result.totalVoters)
    setVotesCast(result.votesCast)
  }, [partyId])

  useEffect(() => {
    load().finally(() => setLoading(false))
  }, [load])

  // Real-time: refresh when anyone votes
  useEffect(() => {
    const channel = supabase
      .channel(`vote:${partyId}`)
      .on('broadcast', { event: 'vote_cast' }, () => load())
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'parties' },
        (payload) => {
          if ((payload.new as { id?: string }).id === partyId &&
              (payload.new as { status?: string }).status === 'resolved') {
            navigate({ to: '/party/$partyId/result', params: { partyId } })
          }
        })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [partyId, load, navigate])

  async function handleVote(restaurantId: string) {
    if (!voterId) return
    setMyVote(restaurantId)
    await submitVote({ data: { partyId, voterId, restaurantId } })
    // Broadcast so others refresh without polling
    const ch = supabase.channel(`vote:${partyId}`)
    await ch.send({ type: 'broadcast', event: 'vote_cast', payload: {} })
    supabase.removeChannel(ch)
    await load()
  }

  async function handleFinalize() {
    setFinalizing(true)
    try {
      await finalizeVoting({ data: { partyId } })
      navigate({ to: '/party/$partyId/result', params: { partyId } })
    } catch {
      setFinalizing(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: 'var(--color-surface-deep)' }}>
        <header className="flex items-center gap-4 px-6 py-5">
          <div className="h-4 w-12 rounded animate-pulse" style={{ background: 'var(--color-surface-petrol)' }} />
        </header>
        <main className="flex-1 px-6 py-4 max-w-lg mx-auto w-full flex flex-col gap-4">
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
      <header className="flex flex-col px-6 pt-5 pb-3">
        <div className="flex items-center gap-4">
          <Link
            to="/party/$partyId/hub"
            params={{ partyId }}
            className="text-sm font-semibold transition-opacity hover:opacity-70"
            style={{ color: 'var(--color-text-mist)' }}
          >
            ← Back
          </Link>
          <span className="font-display text-xl font-semibold" style={{ color: 'var(--color-accent-ember)' }}>
            Bond
          </span>
        </div>
        <PartyProgressBar step={3} />
      </header>

      <main className="flex-1 px-6 pb-10 max-w-lg mx-auto w-full flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-3xl font-semibold" style={{ color: 'var(--color-text-cream)' }}>
            Vote for your pick.
          </h1>
          <p className="text-sm" style={{ color: 'var(--color-text-mist)' }}>
            {votesCast} of {totalVoters} voted
            {allVoted ? ' — all votes are in!' : ''}
          </p>
        </div>

        {candidates.map((c) => (
          <CandidateCard
            key={c.place.id}
            candidate={c}
            selected={myVote === c.place.id}
            onVote={() => handleVote(c.place.id)}
            voteCount={voteCounts[c.place.id] ?? 0}
            totalVotes={votesCast}
            revealed={!!myVote}
          />
        ))}

        {/* Leader finalizes */}
        {myVote && (
          <button
            onClick={handleFinalize}
            disabled={finalizing}
            className="w-full py-4 rounded-2xl font-semibold text-base transition-opacity disabled:opacity-50"
            style={{ background: 'var(--color-accent-ember)', color: 'var(--color-on-ember)' }}
          >
            {finalizing ? 'Locking in…' : allVoted ? 'See results' : 'Lock in result'}
          </button>
        )}

        {myVote && !allVoted && (
          <p className="text-xs text-center -mt-2" style={{ color: 'var(--color-text-mist)' }}>
            Still waiting on {totalVoters - votesCast} vote{totalVoters - votesCast !== 1 ? 's' : ''}. You can lock in early.
          </p>
        )}
      </main>
    </div>
  )
}
