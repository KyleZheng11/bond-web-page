import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { getRecommendation } from '#/features/recommendations'
import type { Candidate } from '#/features/recommendations'

export const Route = createFileRoute('/_auth/party/$partyId/explore')({ component: Explore })

const PRICE_SYMBOL: Record<string, string> = {
  PRICE_LEVEL_INEXPENSIVE: '$',
  PRICE_LEVEL_MODERATE: '$$',
  PRICE_LEVEL_EXPENSIVE: '$$$',
  PRICE_LEVEL_VERY_EXPENSIVE: '$$$$',
}

function CandidateCard({ candidate }: { candidate: Candidate }) {
  const { place, slotLabel } = candidate
  const price = PRICE_SYMBOL[place.priceLevel] ?? ''
  const directionsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}&query_place_id=${place.id}`

  return (
    <div
      className="flex flex-col gap-3 px-4 py-4 rounded-2xl"
      style={{ background: 'var(--color-surface-petrol)', border: '1px solid var(--color-hairline)', boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-mist)' }}>
            {slotLabel}
          </span>
          <p className="font-display text-lg font-semibold leading-tight" style={{ color: 'var(--color-text-cream)' }}>
            {place.name}
          </p>
        </div>
        {price && (
          <span className="shrink-0 text-sm font-bold mt-5" style={{ color: 'var(--color-accent-gold)' }}>
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
          <span className="text-xs" style={{ color: 'var(--color-text-mist)' }}>
            {place.address}
          </span>
        )}
      </div>

      <a
        href={directionsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="self-start text-xs font-semibold px-3 py-1.5 rounded-xl transition-opacity hover:opacity-80"
        style={{ background: 'var(--color-surface-petrol)', color: 'var(--color-text-cream)', border: '1px solid var(--color-hairline)' }}
      >
        Get directions →
      </a>
    </div>
  )
}

function Explore() {
  const { partyId } = Route.useParams()
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getRecommendation({ data: { partyId } })
      .then((rec) => {
        setCandidates((rec.ranked_alternatives ?? []) as unknown as Candidate[])
      })
      .catch(() => setCandidates([]))
      .finally(() => setLoading(false))
  }, [partyId])

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: 'var(--color-surface-deep)' }}>
        <header className="flex items-center gap-4 px-6 py-5">
          <div className="h-4 w-20 rounded animate-pulse" style={{ background: 'var(--color-surface-petrol)' }} />
        </header>
        <main className="flex-1 px-6 py-4 max-w-lg mx-auto w-full flex flex-col gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 rounded-2xl animate-pulse" style={{ background: 'var(--color-surface-petrol)' }} />
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
      <header className="flex items-center gap-4 px-6 py-5">
        <Link
          to="/party/$partyId/result"
          params={{ partyId }}
          className="text-sm font-semibold transition-opacity hover:opacity-70"
          style={{ color: 'var(--color-text-mist)' }}
        >
          ← Results
        </Link>
        <span className="font-display text-xl font-semibold" style={{ color: 'var(--color-accent-ember)' }}>
          Bond
        </span>
      </header>

      <main className="flex-1 px-6 pb-10 max-w-lg mx-auto w-full flex flex-col gap-4 pt-2">
        <div className="flex flex-col gap-1 mb-2">
          <h1 className="font-display text-3xl font-semibold" style={{ color: 'var(--color-text-cream)' }}>
            All options
          </h1>
          <p className="text-sm" style={{ color: 'var(--color-text-mist)' }}>
            The four restaurants your group voted on.
          </p>
        </div>

        {candidates.length === 0 ? (
          <p className="text-sm py-8 text-center" style={{ color: 'var(--color-text-mist)' }}>
            No candidates found.
          </p>
        ) : (
          candidates.map((c) => <CandidateCard key={c.place.id} candidate={c} />)
        )}
      </main>
    </div>
  )
}
