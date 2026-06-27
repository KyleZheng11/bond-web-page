import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { resolveInvite } from '#/features/invites'
import { getRecommendation } from '#/features/recommendations'
import type { Place } from '#/features/recommendations'
import type { Tables } from '#/types/database'

export const Route = createFileRoute('/invite/$token/results')({ component: GuestResults })

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

function GuestResults() {
  const { token } = Route.useParams()
  const [rec, setRec] = useState<Tables<'recommendations'> | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    resolveInvite({ data: { token } })
      .then((result) => getRecommendation({ data: { partyId: result.party.id } }))
      .then(setRec)
      .catch(() => setRec(null))
      .finally(() => setLoading(false))
  }, [token])

  function shareResult() {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: 'var(--color-surface-deep)' }}>
        <header className="px-6 py-5">
          <div className="h-6 w-16 rounded animate-pulse" style={{ background: 'var(--color-surface-petrol)' }} />
        </header>
        <div className="h-56 animate-pulse" style={{ background: 'var(--color-surface-petrol)' }} />
        <main className="flex-1 px-6 py-6 max-w-lg mx-auto w-full flex flex-col gap-4">
          <div className="h-10 w-3/4 rounded-xl animate-pulse" style={{ background: 'var(--color-surface-petrol)' }} />
          <div className="h-4 w-1/2 rounded animate-pulse" style={{ background: 'var(--color-surface-petrol)' }} />
          <div className="h-20 rounded-2xl animate-pulse" style={{ background: 'var(--color-surface-petrol)' }} />
          <div className="h-12 rounded-2xl animate-pulse" style={{ background: 'var(--color-surface-petrol)' }} />
        </main>
      </div>
    )
  }

  if (!rec) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center"
        style={{ background: 'var(--color-surface-deep)' }}
      >
        <span className="font-display text-2xl font-bold" style={{ color: 'var(--color-accent-gold)' }}>Bond</span>
        <p className="font-display text-xl" style={{ color: 'var(--color-text-cream)' }}>No result yet.</p>
        <p className="text-sm" style={{ color: 'var(--color-text-mist)' }}>
          The group leader hasn't locked in a result yet.
        </p>
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

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'var(--color-surface-deep)', color: 'var(--color-text-cream)' }}
    >
      <header className="px-6 py-5">
        <span className="font-display text-xl font-semibold" style={{ color: 'var(--color-accent-gold)' }}>Bond</span>
      </header>

      <div className="w-full h-52 relative overflow-hidden flex items-end px-6 pb-5">
        {place.photoUrl ? (
          <>
            <img
              src={place.photoUrl}
              alt={rec.restaurant_name}
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div
              className="absolute inset-0"
              style={{ background: 'linear-gradient(to top, rgba(11,31,45,0.85) 0%, transparent 50%)' }}
            />
          </>
        ) : (
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(135deg, var(--color-surface-twilight) 0%, #1a3a2a 50%, var(--color-surface-petrol) 100%)' }}
          />
        )}
        <span
          className="relative text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full"
          style={{ background: 'rgba(11,31,45,0.6)', color: 'var(--color-text-mist)' }}
        >
          Bond's pick
        </span>
      </div>

      <main className="flex-1 px-6 pb-10 max-w-lg mx-auto w-full flex flex-col gap-6 pt-6">
        <div className="flex flex-col gap-3">
          <h1 className="font-display text-4xl font-semibold leading-tight" style={{ color: 'var(--color-text-cream)' }}>
            {rec.restaurant_name}
          </h1>
          {cuisineTags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {cuisineTags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs font-semibold px-3 py-1 rounded-full"
                  style={{ background: 'var(--color-surface-petrol)', color: 'var(--color-text-mist)' }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        <div
          className="flex items-center gap-4 px-4 py-3 rounded-2xl flex-wrap"
          style={{ background: 'var(--color-surface-petrol)' }}
        >
          {place.rating > 0 && (
            <div className="flex items-center gap-1.5">
              <span style={{ color: 'var(--color-accent-gold)' }}>★</span>
              <span className="text-sm font-semibold" style={{ color: 'var(--color-text-cream)' }}>{place.rating}</span>
              {place.reviewCount > 0 && (
                <span className="text-xs" style={{ color: 'var(--color-text-mist)' }}>
                  ({place.reviewCount.toLocaleString()})
                </span>
              )}
            </div>
          )}
          {priceSymbol !== '—' && (
            <>
              <span style={{ color: 'var(--color-surface-twilight)' }}>·</span>
              <span className="text-sm font-semibold" style={{ color: 'var(--color-accent-gold)' }}>{priceSymbol}</span>
            </>
          )}
          {place.address && (
            <>
              <span style={{ color: 'var(--color-surface-twilight)' }}>·</span>
              <span className="text-xs" style={{ color: 'var(--color-text-mist)' }}>{place.address}</span>
            </>
          )}
        </div>

        <section className="flex flex-col gap-2">
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-mist)' }}>
            Why Bond picked this
          </p>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-cream)' }}>
            {rec.reason}
          </p>
        </section>

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
            style={{ background: 'var(--color-surface-petrol)', color: 'var(--color-text-cream)' }}
          >
            {copied ? 'Link copied!' : 'Share result'}
          </button>
        </div>
      </main>
    </div>
  )
}
