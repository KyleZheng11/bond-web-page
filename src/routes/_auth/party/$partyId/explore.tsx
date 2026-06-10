import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { useAuth } from '#/features/auth'
import { getPartyCreator } from '#/features/parties'
import { getRecommendation } from '#/features/recommendations'
import type { RankedAlternative, Place } from '#/features/recommendations'

export const Route = createFileRoute('/_auth/party/$partyId/explore')({ component: Explore })

const PRICE_SYMBOL: Record<string, string> = {
  PRICE_LEVEL_INEXPENSIVE: '$',
  PRICE_LEVEL_MODERATE: '$$',
  PRICE_LEVEL_EXPENSIVE: '$$$',
  PRICE_LEVEL_VERY_EXPENSIVE: '$$$$',
}

const CATEGORY_LABEL: Record<RankedAlternative['category'], string> = {
  different_vibe: 'Different vibe',
  different_cuisine: 'Different cuisine',
  different_budget: 'Different budget',
}

const CATEGORIES: RankedAlternative['category'][] = [
  'different_vibe',
  'different_cuisine',
  'different_budget',
]

function AlternativeCard({ alt }: { alt: RankedAlternative }) {
  const place = alt.restaurant_data as unknown as Place
  const price = PRICE_SYMBOL[place.priceLevel] ?? ''
  const directionsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}&query_place_id=${place.id}`

  return (
    <div
      className="flex flex-col gap-3 px-4 py-4 rounded-2xl"
      style={{ background: 'var(--color-surface-petrol)', border: '1px solid rgba(240,228,204,0.08)' }}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="font-display text-lg font-semibold leading-tight" style={{ color: 'var(--color-text-cream)' }}>
          {alt.restaurant_name}
        </p>
        {price && (
          <span className="shrink-0 text-sm font-bold" style={{ color: 'var(--color-accent-gold)' }}>
            {price}
          </span>
        )}
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        {place.rating > 0 && (
          <span className="flex items-center gap-1 text-sm" style={{ color: 'var(--color-text-mist)' }}>
            <span style={{ color: 'var(--color-accent-gold)' }}>★</span>
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
        style={{ background: 'var(--color-surface-twilight)', color: 'var(--color-text-cream)' }}
      >
        Get directions →
      </a>
    </div>
  )
}

function Explore() {
  const { partyId } = Route.useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [alternatives, setAlternatives] = useState<RankedAlternative[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return

    Promise.all([
      getPartyCreator({ data: { partyId } }),
      getRecommendation({ data: { partyId } }),
    ])
      .then(([party, rec]) => {
        if (party.creator_id !== user.id) {
          navigate({ to: '/party/$partyId/results', params: { partyId } })
          return
        }
        const alts = (rec.ranked_alternatives ?? []) as unknown as RankedAlternative[]
        setAlternatives(alts)
      })
      .catch(() => navigate({ to: '/party/$partyId/results', params: { partyId } }))
      .finally(() => setLoading(false))
  }, [partyId, user, navigate])

  // ── Skeleton ─────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: 'var(--color-surface-deep)' }}>
        <header className="flex items-center gap-4 px-6 py-5">
          <div className="h-4 w-20 rounded animate-pulse" style={{ background: 'var(--color-surface-petrol)' }} />
        </header>
        <main className="flex-1 px-6 py-4 max-w-lg mx-auto w-full flex flex-col gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex flex-col gap-3">
              <div className="h-3 w-32 rounded animate-pulse" style={{ background: 'var(--color-surface-petrol)' }} />
              <div className="h-28 rounded-2xl animate-pulse" style={{ background: 'var(--color-surface-petrol)' }} />
            </div>
          ))}
        </main>
      </div>
    )
  }

  const byCategory = Object.fromEntries(
    CATEGORIES.map((cat) => [cat, alternatives.filter((a) => a.category === cat)])
  ) as Record<RankedAlternative['category'], RankedAlternative[]>

  const hasAnyAlternatives = alternatives.length > 0

  // ── UI ────────────────────────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'var(--color-surface-deep)', color: 'var(--color-text-cream)' }}
    >
      {/* Header */}
      <header className="flex items-center gap-4 px-6 py-5">
        <Link
          to="/party/$partyId/results"
          params={{ partyId }}
          className="text-sm font-semibold transition-opacity hover:opacity-70"
          style={{ color: 'var(--color-text-mist)' }}
        >
          ← Results
        </Link>
        <span className="font-display text-xl font-semibold" style={{ color: 'var(--color-accent-gold)' }}>
          Bond
        </span>
      </header>

      <main className="flex-1 px-6 pb-10 max-w-lg mx-auto w-full flex flex-col gap-8 pt-2">

        {/* Title */}
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-3xl font-semibold" style={{ color: 'var(--color-text-cream)' }}>
            Explore alternatives
          </h1>
          <p className="text-sm" style={{ color: 'var(--color-text-mist)' }}>
            Only you can see these.
          </p>
        </div>

        {!hasAnyAlternatives ? (
          <div
            className="flex flex-col items-center gap-3 py-12 rounded-2xl"
            style={{ background: 'var(--color-surface-petrol)' }}
          >
            <p className="font-display text-lg" style={{ color: 'var(--color-text-cream)' }}>
              No alternatives found.
            </p>
            <p className="text-sm text-center max-w-xs" style={{ color: 'var(--color-text-mist)' }}>
              Bond's first pick was the only strong match near your location.
            </p>
          </div>
        ) : (
          CATEGORIES.map((cat) => {
            const items = byCategory[cat]
            if (items.length === 0) return null
            return (
              <section key={cat} className="flex flex-col gap-3">
                <p
                  className="text-xs font-bold uppercase tracking-widest"
                  style={{ color: 'var(--color-text-mist)' }}
                >
                  {CATEGORY_LABEL[cat]}
                </p>
                {items.map((alt) => (
                  <AlternativeCard key={alt.restaurant_id} alt={alt} />
                ))}
              </section>
            )
          })
        )}
      </main>
    </div>
  )
}
