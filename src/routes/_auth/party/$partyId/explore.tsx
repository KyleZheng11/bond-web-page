import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { Star, Navigation } from 'lucide-react'
import { getRecommendation } from '#/features/recommendations'
import type { Candidate } from '#/features/recommendations'
import { AppHeader } from '#/components/ui'

export const Route = createFileRoute('/_auth/party/$partyId/explore')({ component: Explore })

const PRICE_SYMBOL: Record<string, string> = {
  PRICE_LEVEL_INEXPENSIVE: 'Under $15',
  PRICE_LEVEL_MODERATE: '$15–$30',
  PRICE_LEVEL_EXPENSIVE: '$30–$60',
  PRICE_LEVEL_VERY_EXPENSIVE: '$60+',
}

function CandidateCard({ candidate }: { candidate: Candidate }) {
  const { place, slotLabel } = candidate
  const price = PRICE_SYMBOL[place.priceLevel] ?? ''
  const directionsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}&query_place_id=${place.id}`

  return (
    <div className="card flex flex-col gap-3 px-5 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="eyebrow">{slotLabel}</span>
          <p className="font-display text-lg font-bold leading-tight">{place.name}</p>
        </div>
        {price && (
          <span className="shrink-0 text-sm font-bold mt-5" style={{ color: 'var(--color-blueberry)' }}>
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
          <span className="text-xs" style={{ color: 'var(--color-ink-soft)' }}>
            {place.address}
          </span>
        )}
      </div>

      <a
        href={directionsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="btn btn-secondary self-start !min-h-9 !py-1.5 !px-3.5 text-xs"
      >
        <Navigation size={13} aria-hidden />
        Get directions
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
      <div className="min-h-dvh flex flex-col">
        <div className="max-w-lg md:max-w-285 mx-auto w-full">
          <AppHeader backTo={`/party/${partyId}/result`} backLabel="Results" wide />
        </div>
        <main className="flex-1 px-6 py-4 max-w-lg md:max-w-285 mx-auto w-full">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 rounded-[20px] animate-pulse" style={{ background: 'var(--color-surface)' }} />
            ))}
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-dvh flex flex-col">
      <div className="max-w-lg md:max-w-285 mx-auto w-full">
        <AppHeader backTo={`/party/${partyId}/result`} backLabel="Results" wide />
      </div>

      <main className="flex-1 px-6 pb-10 max-w-lg md:max-w-285 mx-auto w-full pt-2">
        <div className="flex flex-col gap-1 mb-4">
          <h1 className="display text-3xl">All options</h1>
          <p className="text-sm" style={{ color: 'var(--color-ink-soft)' }}>
            The three restaurants your group voted on.
          </p>
        </div>

        {candidates.length === 0 ? (
          <p className="text-sm py-8 text-center" style={{ color: 'var(--color-ink-soft)' }}>
            No candidates found.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {candidates.map((c) => <CandidateCard key={c.place.id} candidate={c} />)}
          </div>
        )}
      </main>
    </div>
  )
}
