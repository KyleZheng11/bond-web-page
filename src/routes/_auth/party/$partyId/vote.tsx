import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect, useCallback } from 'react'
import { Star, Check } from 'lucide-react'
import { useAuth } from '#/features/auth'
import { finalizeVoting, getCandidates, submitVote  } from '#/features/votes'
import { PartyProgressBar } from '#/features/parties'
import { supabase } from '#/lib/supabase'
import { getRecommendation } from '#/features/recommendations'
import type { Candidate } from '#/features/recommendations'
import { AppHeader, ShinyButton } from '#/components/ui'

export const Route = createFileRoute('/_auth/party/$partyId/vote')({ component: VoteScreen })

const PRICE_SYMBOL: Record<string, string> = {
  PRICE_LEVEL_INEXPENSIVE: 'Under $15',
  PRICE_LEVEL_MODERATE: '$15–$30',
  PRICE_LEVEL_EXPENSIVE: '$30–$60',
  PRICE_LEVEL_VERY_EXPENSIVE: '$60+',
}

function CandidateCard({
  candidate,
  selected,
  onVote,
}: {
  candidate: Candidate
  selected: boolean
  onVote: () => void
}) {
  const { place, slotLabel } = candidate
  const price = PRICE_SYMBOL[place.priceLevel] ?? ''

  return (
    <div
      className="card flex flex-col overflow-hidden transition-colors"
      style={selected ? { borderColor: 'var(--color-bond)', borderWidth: '1.5px' } : undefined}
    >
      {/* Photo */}
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
        {!place.photoUrl && (
          <span className="eyebrow">{slotLabel}</span>
        )}

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
              {place.reviewCount > 0 && (
                <span className="text-xs">({place.reviewCount.toLocaleString()})</span>
              )}
            </span>
          )}
          {place.address && (
            <span className="text-xs truncate" style={{ color: 'var(--color-ink-soft)' }}>
              {place.address}
            </span>
          )}
        </div>

        <button
          onClick={onVote}
          className={`btn w-full py-3 !rounded-xl text-sm ${selected ? 'btn-dark' : 'btn-secondary'}`}
        >
          {selected && <Check size={15} aria-hidden />}
          {selected ? 'Your pick' : 'Vote for this'}
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
  const [totalVoters, setTotalVoters] = useState(0)
  const [votesCast, setVotesCast] = useState(0)
  const [creatorId, setCreatorId] = useState<string | null>(null)
  const [myVote, setMyVote] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [finalizing, setFinalizing] = useState(false)

  const voterId = user?.id ?? ''
  const isLeader = !!user && user.id === creatorId
  const allVoted = votesCast >= totalVoters && totalVoters > 0

  const load = useCallback(async () => {
    const result = await getCandidates({ data: { partyId } })
    setCandidates(result.candidates)
    setTotalVoters(result.totalVoters)
    setVotesCast(result.votesCast)
    setCreatorId(result.creatorId)
  }, [partyId])

  useEffect(() => {
    load().finally(() => setLoading(false))
  }, [load])

  // Poll every 2s so vote counts and the progress bar stay accurate even if
  // a guest's broadcast never arrives.
  useEffect(() => {
    const interval = setInterval(load, 2000)
    return () => clearInterval(interval)
  }, [load])

  // Once this user has voted, also poll for the final result as a guaranteed
  // fallback in case the result_locked broadcast doesn't arrive.
  useEffect(() => {
    if (!myVote) return
    const interval = setInterval(async () => {
      try {
        const rec = await getRecommendation({ data: { partyId } })
        if (rec.restaurant_id !== 'pending') {
          navigate({ to: '/party/$partyId/result', params: { partyId } })
        }
      } catch { /* not ready yet */ }
    }, 3000)
    return () => clearInterval(interval)
  }, [myVote, partyId, navigate])

  // Real-time: refresh when anyone votes
  useEffect(() => {
    const channel = supabase
      .channel(`vote:${partyId}`)
      .on('broadcast', { event: 'vote_cast' }, () => load())
      .on('broadcast', { event: 'result_locked' }, () => {
        navigate({ to: '/party/$partyId/result', params: { partyId } })
      })
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
    await submitVote({ data: { partyId, restaurantId } })
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
      // Broadcast so every guest jumps to the result immediately instead of
      // waiting on their own poll cycle.
      const ch = supabase.channel(`vote:${partyId}`)
      await ch.send({ type: 'broadcast', event: 'result_locked', payload: {} })
      supabase.removeChannel(ch)
      navigate({ to: '/party/$partyId/result', params: { partyId } })
    } catch {
      setFinalizing(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-dvh flex flex-col">
        <div className="max-w-lg md:max-w-285 mx-auto w-full">
          <AppHeader backTo="/home" wide />
        </div>
        <main className="flex-1 px-6 py-4 max-w-lg md:max-w-285 mx-auto w-full">
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
      <div className="max-w-lg md:max-w-285 mx-auto w-full">
        <AppHeader backTo={`/party/${partyId}/hub`} wide />
        <div className="px-6">
          <PartyProgressBar step={3} />
        </div>
      </div>

      <main className="flex-1 px-6 pb-10 pt-4 max-w-lg md:max-w-285 mx-auto w-full flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <h1 className="display text-3xl">Vote for your pick.</h1>
          {/* Voting progress bar — visible to the leader only */}
          {isLeader && totalVoters > 0 && (
            <div className="flex flex-col gap-1.5 pt-1">
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--color-line)' }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.round((votesCast / totalVoters) * 100)}%`,
                    background: allVoted ? 'var(--color-success)' : 'var(--color-sunrise)',
                  }}
                />
              </div>
              <p className="text-xs" style={{ color: 'var(--color-ink-soft)' }}>
                {votesCast} of {totalVoters} voted{allVoted ? ' — all in!' : ''}
              </p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {candidates.map((c) => (
            <CandidateCard
              key={c.place.id}
              candidate={c}
              selected={myVote === c.place.id}
              onVote={() => handleVote(c.place.id)}
            />
          ))}
        </div>

        {/* Only the party leader can lock in the result */}
        {isLeader && myVote && (
          <ShinyButton
            onClick={handleFinalize}
            disabled={finalizing}
            className="w-full md:max-w-sm md:mx-auto"
          >
            {finalizing ? 'Locking in…' : allVoted ? 'See results' : 'Lock in result'}
          </ShinyButton>
        )}

        {isLeader && myVote && !allVoted && (
          <p className="text-xs text-center -mt-2" style={{ color: 'var(--color-ink-soft)' }}>
            Still waiting on {totalVoters - votesCast} vote{totalVoters - votesCast !== 1 ? 's' : ''}. You can lock in early.
          </p>
        )}

        {!isLeader && myVote && (
          <div className="card px-4 py-4 text-sm text-center md:max-w-sm md:mx-auto" style={{ color: 'var(--color-ink-soft)' }}>
            Vote's in — you can still change your pick until the host locks in the result.
          </div>
        )}
      </main>
    </div>
  )
}
