import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { resolveInvite } from '#/features/invites'
import { getRecommendation } from '#/features/recommendations'
import { supabase } from '#/lib/supabase'
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
  const navigate = useNavigate()

  const [partyId, setPartyId] = useState<string | null>(null)
  const [rec, setRec] = useState<Tables<'recommendations'> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    resolveInvite({ data: { token } })
      .then(async (result) => {
        setPartyId(result.party.id)
        if (result.party.status === 'voting') {
          // Party not resolved yet — redirect back to vote screen
          navigate({ to: '/invite/$token/vote', params: { token } })
          return
        }
        if (result.party.status !== 'resolved') {
          // Still open/searching — redirect to hub
          navigate({ to: '/invite/$token/', params: { token } })
          return
        }
        const recommendation = await getRecommendation({ data: { partyId: result.party.id } })
        setRec(recommendation)
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [token, navigate])

  // Realtime: if we arrive early, watch for the result to come in
  useEffect(() => {
    if (!partyId || rec) return

    const channel = supabase
      .channel(`results:${partyId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'parties' },
        (payload) => {
          const updated = payload.new as { id?: string; status?: string }
          if (updated.id !== partyId || updated.status !== 'resolved') return
          getRecommendation({ data: { partyId } })
            .then(setRec)
            .catch(() => {})
        },
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [partyId, rec])

  if (loading) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center gap-6 px-6"
        style={{ background: 'var(--color-surface-deep)' }}
      >
        <div
          className="w-10 h-10 rounded-full"
          style={{
            border: '4px solid var(--color-hairline)',
            borderTopColor: 'var(--color-accent-ember)',
            animation: 'spin .8s linear infinite',
          }}
        />
      </div>
    )
  }

  if (error) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center"
        style={{ background: 'var(--color-surface-deep)' }}
      >
        <span className="font-display text-4xl font-bold" style={{ color: 'var(--color-accent-ember)' }}>
          Bond
        </span>
        <h1 className="font-display text-2xl font-semibold mt-4" style={{ color: 'var(--color-text-cream)' }}>
          This link isn't working.
        </h1>
        <p className="text-sm max-w-xs" style={{ color: 'var(--color-text-mist)' }}>
          {error}
        </p>
      </div>
    )
  }

  if (!rec) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-6 text-center"
        style={{ background: 'var(--color-surface-deep)' }}
      >
        <div
          className="w-12 h-12 rounded-full mb-6"
          style={{
            border: '4px solid var(--color-hairline)',
            borderTopColor: 'var(--color-accent-ember)',
            animation: 'spin .8s linear infinite',
          }}
        />
        <h1
          className="font-display text-2xl font-black"
          style={{ color: 'var(--color-text-cream)', letterSpacing: '-0.02em' }}
        >
          Waiting for the result…
        </h1>
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

  function shareResult() {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'var(--color-surface-deep)', color: 'var(--color-text-cream)' }}
    >
      <header className="flex items-center gap-4 px-6 py-5">
        <span className="font-display text-xl font-semibold" style={{ color: 'var(--color-accent-ember)' }}>
          Bond
        </span>
      </header>

      <div className="mx-5.5 mt-2 h-52 relative rounded-[18px] overflow-hidden flex items-start px-4 pt-4">
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
          <div className="absolute inset-0" style={{ background: 'var(--color-photo-placeholder)' }} />
        )}
        <span
          className="relative text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full"
          style={{ background: 'var(--color-accent-ember)', color: 'var(--color-on-ember)' }}
        >
          Bond's pick
        </span>
      </div>

      <main className="flex-1 px-5.5 pb-10 max-w-lg mx-auto w-full flex flex-col gap-6 pt-6">
        <div className="flex flex-col gap-3">
          <h1
            className="font-display font-black leading-tight"
            style={{ fontSize: 29, letterSpacing: '-0.02em' }}
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

        <div
          className="flex items-center gap-4 px-4 py-3 rounded-2xl flex-wrap"
          style={{ background: 'var(--color-surface-petrol)', border: '1px solid var(--color-hairline)' }}
        >
          {place.rating > 0 && (
            <div className="flex items-center gap-1.5">
              <span style={{ color: 'var(--color-accent-ember)' }}>★</span>
              <span className="text-sm font-semibold">{place.rating}</span>
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
              <span className="text-xs" style={{ color: 'var(--color-text-mist)' }}>{place.address}</span>
            </>
          )}
        </div>

        <section className="flex flex-col gap-2">
          <p className="text-[10px] font-black uppercase tracking-[.14em]" style={{ color: 'var(--color-text-mist)' }}>
            Why Bond picked this
          </p>
          <p className="text-sm leading-relaxed">{rec.reason}</p>
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
            style={{ background: 'var(--color-surface-petrol)', color: 'var(--color-text-cream)', border: '1px solid var(--color-hairline)' }}
          >
            {copied ? 'Link copied!' : 'Share result'}
          </button>
        </div>
      </main>
    </div>
  )
}
