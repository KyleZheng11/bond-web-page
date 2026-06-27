import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { getRecommendation } from '#/features/recommendations'
import type { Place } from '#/features/recommendations'
import type { Tables } from '#/types/database'

export const Route = createFileRoute('/_auth/party/$partyId/result')({ component: Result })

const PRICE_SYMBOL: Record<string, string> = {
  PRICE_LEVEL_INEXPENSIVE: '$',
  PRICE_LEVEL_MODERATE: '$$',
  PRICE_LEVEL_EXPENSIVE: '$$$',
  PRICE_LEVEL_VERY_EXPENSIVE: '$$$$',
}

function formatCuisineTag(type: string): string {
  return type
    .replace('_restaurant', '')
    .replace('_shop', '')
    .replace('_house', ' house')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function Result() {
  const { partyId } = Route.useParams()
  const [rec, setRec] = useState<Tables<'recommendations'> | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    getRecommendation({ data: { partyId } })
      .then(setRec)
      .catch(() => setRec(null))
      .finally(() => setLoading(false))
  }, [partyId])

  function shareResult() {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ── Searching / loading state ───────────────────────────────────────────────
  if (loading) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-6 text-center"
        style={{ background: 'var(--color-surface-deep)' }}
      >
        <div className="flex flex-col items-center gap-6 max-w-xs">
          {/* Spinner */}
          <div
            className="w-12 h-12 rounded-full"
            style={{
              border: '4px solid var(--color-hairline)',
              borderTopColor: 'var(--color-accent-ember)',
              animation: 'spin .8s linear infinite',
            }}
          />
          <div className="flex flex-col gap-2">
            <h1
              className="font-display text-3xl font-black leading-tight"
              style={{ color: 'var(--color-text-cream)', letterSpacing: '-0.02em' }}
            >
              Reading the room…
            </h1>
            <p className="text-sm" style={{ color: 'var(--color-text-mist)' }}>
              Bond is picking the perfect spot for your crew.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // ── Error / no result yet ───────────────────────────────────────────────────
  if (!rec) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center gap-4 px-6"
        style={{ background: 'var(--color-surface-deep)' }}
      >
        <p className="font-display text-xl" style={{ color: 'var(--color-text-cream)' }}>
          No result yet.
        </p>
        <p className="text-sm text-center" style={{ color: 'var(--color-text-mist)' }}>
          The recommendation hasn't been generated yet, or something went wrong.
        </p>
        <Link
          to="/party/$partyId/hub"
          params={{ partyId }}
          className="mt-2 text-sm font-semibold"
          style={{ color: 'var(--color-accent-ember)' }}
        >
          ← Back to party
        </Link>
      </div>
    )
  }

  const place = rec.restaurant_data as unknown as Place
  const priceSymbol = PRICE_SYMBOL[place.priceLevel] ?? '—'

  const cuisineTags = place.types
    .filter((t) => t !== 'restaurant' && t !== 'food' && t !== 'establishment' && t !== 'point_of_interest')
    .map(formatCuisineTag)
    .slice(0, 3)

  const directionsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}&query_place_id=${place.id}`

  // ── Resolved view ───────────────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'var(--color-surface-deep)', color: 'var(--color-text-cream)' }}
    >
      <header className="flex items-center gap-4 px-6 py-5">
        <Link
          to="/home"
          className="text-sm font-semibold transition-opacity hover:opacity-70"
          style={{ color: 'var(--color-text-mist)' }}
        >
          ← Home
        </Link>
        <span className="font-display text-xl font-semibold" style={{ color: 'var(--color-accent-ember)' }}>
          Bond
        </span>
      </header>

      {/* Photo block */}
      <div className="mx-[22px] mt-2 h-52 relative rounded-[18px] overflow-hidden flex items-start px-4 pt-4">
        {place.photoUrl ? (
          <>
            <img
              src={place.photoUrl}
              alt={rec.restaurant_name}
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div
              className="absolute inset-0"
              style={{ background: 'linear-gradient(to bottom, rgba(33,27,22,0.50) 0%, transparent 50%)' }}
            />
          </>
        ) : (
          <div
            className="absolute inset-0"
            style={{ background: 'var(--color-photo-placeholder)' }}
          />
        )}
        <span
          className="relative text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full"
          style={{ background: 'var(--color-accent-ember)', color: 'var(--color-on-ember)' }}
        >
          Bond's pick
        </span>
      </div>

      <main className="flex-1 px-[22px] pb-10 max-w-lg mx-auto w-full flex flex-col gap-6 pt-6">

        {/* Name + cuisine tags */}
        <div className="flex flex-col gap-3">
          <h1
            className="font-display font-black leading-tight"
            style={{ fontSize: 29, color: 'var(--color-text-cream)', letterSpacing: '-0.02em' }}
          >
            {rec.restaurant_name}
          </h1>
          {cuisineTags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {cuisineTags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs font-semibold px-3 py-1 rounded-full"
                  style={{ background: 'var(--color-surface-petrol)', color: 'var(--color-text-mist)', border: '1px solid var(--color-hairline)' }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Stats row */}
        <div
          className="flex items-center gap-4 px-4 py-3 rounded-2xl flex-wrap"
          style={{ background: 'var(--color-surface-petrol)', border: '1px solid var(--color-hairline)' }}
        >
          {place.rating > 0 && (
            <div className="flex items-center gap-1.5">
              <span style={{ color: 'var(--color-accent-ember)' }}>★</span>
              <span className="text-sm font-semibold" style={{ color: 'var(--color-text-cream)' }}>
                {place.rating}
              </span>
              {place.reviewCount > 0 && (
                <span className="text-xs" style={{ color: 'var(--color-text-mist)' }}>
                  ({place.reviewCount.toLocaleString()})
                </span>
              )}
            </div>
          )}

          {priceSymbol !== '—' && (
            <>
              <span style={{ color: 'var(--color-hairline)' }}>·</span>
              <span className="text-sm font-semibold" style={{ color: 'var(--color-accent-gold)' }}>
                {priceSymbol}
              </span>
            </>
          )}

          {place.address && (
            <>
              <span style={{ color: 'var(--color-hairline)' }}>·</span>
              <span className="text-xs" style={{ color: 'var(--color-text-mist)' }}>
                {place.address}
              </span>
            </>
          )}
        </div>

        {/* Why Bond picked this */}
        <section className="flex flex-col gap-2">
          <p className="text-[10px] font-black uppercase tracking-[.14em]" style={{ color: 'var(--color-text-mist)' }}>
            Why Bond picked this
          </p>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-cream)' }}>
            {rec.reason}
          </p>
        </section>

        {/* Actions */}
        <div className="flex flex-col gap-3 pt-2">
          <a
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-4 rounded-2xl font-semibold text-sm text-center transition-opacity hover:opacity-90"
            style={{ background: 'var(--color-accent-ember)', color: 'var(--color-on-ember)' }}
          >
            Get directions
          </a>

          <button
            onClick={shareResult}
            className="w-full py-4 rounded-2xl font-semibold text-sm transition-opacity hover:opacity-80"
            style={{
              background: 'var(--color-surface-petrol)',
              color: 'var(--color-text-cream)',
              border: '1px solid var(--color-hairline)',
            }}
          >
            {copied ? 'Link copied!' : 'Share result'}
          </button>

          <Link
            to="/party/$partyId/explore"
            params={{ partyId }}
            className="w-full py-4 rounded-2xl font-semibold text-sm text-center transition-opacity hover:opacity-70"
            style={{ color: 'var(--color-text-mist)' }}
          >
            Explore alternatives →
          </Link>
        </div>
      </main>
    </div>
  )
}
