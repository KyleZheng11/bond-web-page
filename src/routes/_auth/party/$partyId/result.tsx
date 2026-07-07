import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { Star, Navigation, Share2, Compass } from 'lucide-react'
import { getRecommendation } from '#/features/recommendations'
import { PartyProgressBar } from '#/features/parties'
import type { Place } from '#/features/recommendations'
import type { Tables } from '#/types/database'
import { AppHeader, Spinner } from '#/components/ui'

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
      <div className="dawn-sky min-h-dvh flex flex-col items-center justify-center px-6 text-center">
        <div className="dawn-sun dawn-sun-rise" aria-hidden />
        <div className="dawn-horizon" aria-hidden />
        <div className="relative z-10 flex flex-col items-center gap-6 max-w-xs">
          <Spinner size={48} dark />
          <div className="flex flex-col gap-2 text-on-dawn">
            <h1 className="font-display font-bold text-3xl leading-tight" style={{ color: '#ffffff', letterSpacing: '-0.02em' }}>
              Reading the room…
            </h1>
            <p className="text-sm" style={{ color: 'var(--color-on-deep)' }}>
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
      <div className="min-h-dvh flex flex-col items-center justify-center gap-4 px-6">
        <p className="display text-xl">No result yet.</p>
        <p className="text-sm text-center" style={{ color: 'var(--color-ink-soft)' }}>
          The recommendation hasn't been generated yet, or something went wrong.
        </p>
        <Link
          to="/party/$partyId/hub"
          params={{ partyId }}
          className="mt-2 text-sm font-semibold transition-opacity hover:opacity-70"
          style={{ color: 'var(--color-blueberry)' }}
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
    <div className="min-h-dvh flex flex-col">
      {/* Nav, progress bar, and the photo all share one max-width so
          their edges line up — the photo used to run wider than the
          capped nav above it, leaving the header looking stranded on
          large screens. */}
      <div className="max-w-285 mx-auto w-full">
        <AppHeader backTo="/home" backLabel="Home" wide />
        <div className="px-6">
          <PartyProgressBar step={4} />
        </div>

        {/* Photo block */}
        <div className="mt-2 mx-6 h-72 md:h-[56vh] md:max-h-125 relative rounded-[20px] overflow-hidden flex items-start px-4 pt-4">
          {place.photoUrl ? (
            <>
              <img
                src={place.photoUrl}
                alt={rec.restaurant_name}
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div
                className="absolute inset-0"
                style={{ background: 'linear-gradient(to bottom, rgba(11,39,64,0.5) 0%, transparent 50%)' }}
              />
            </>
          ) : (
            <div className="absolute inset-0 dawn-sky">
              <div className="dawn-sun" aria-hidden />
              <div className="dawn-horizon" aria-hidden />
            </div>
          )}
          <span
            className="relative text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full"
            style={{ background: 'var(--color-sunrise)', color: 'var(--color-on-sunrise)' }}
          >
            Bond's pick
          </span>
        </div>
      </div>

      {/* Below md, this is a single column in DOM order (unchanged
          from the original mobile layout). At md+ it splits into a
          reading column plus a sticky action panel, like a real
          desktop page instead of a phone screen stretched wide. */}
      <main className="flex-1 px-6 pb-10 max-w-285 mx-auto w-full pt-6">
        <div className="max-w-2xl md:max-w-none mx-auto grid md:grid-cols-[1fr_21rem] gap-8 md:gap-14 lg:gap-20">

          <div className="flex flex-col gap-6 min-w-0">
            {/* Name + cuisine tags */}
            <div className="flex flex-col gap-3">
              <h1 className="font-display font-bold leading-tight text-[30px] md:text-4xl" style={{ letterSpacing: '-0.02em' }}>
                {rec.restaurant_name}
              </h1>
              {cuisineTags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {cuisineTags.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs font-semibold px-3 py-1 rounded-full"
                      style={{ background: 'var(--color-surface)', color: 'var(--color-ink-soft)', border: '1px solid var(--color-line)' }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Stats row */}
            <div className="card flex items-center gap-4 px-4 py-3 flex-wrap">
              {place.rating > 0 && (
                <div className="flex items-center gap-1.5">
                  <Star size={15} fill="var(--color-sunrise)" color="var(--color-sunrise)" aria-hidden />
                  <span className="text-sm font-semibold">{place.rating}</span>
                  {place.reviewCount > 0 && (
                    <span className="text-xs" style={{ color: 'var(--color-ink-soft)' }}>
                      ({place.reviewCount.toLocaleString()})
                    </span>
                  )}
                </div>
              )}

              {priceSymbol !== '—' && (
                <>
                  <span style={{ color: 'var(--color-line)' }}>·</span>
                  <span className="text-sm font-semibold" style={{ color: 'var(--color-blueberry)' }}>
                    {priceSymbol}
                  </span>
                </>
              )}

              {place.address && (
                <>
                  <span style={{ color: 'var(--color-line)' }}>·</span>
                  <span className="text-xs" style={{ color: 'var(--color-ink-soft)' }}>
                    {place.address}
                  </span>
                </>
              )}
            </div>

            {/* Why Bond picked this */}
            <section className="flex flex-col gap-2 max-w-xl">
              <p className="eyebrow">Why Bond picked this</p>
              <p className="text-sm leading-relaxed">{rec.reason}</p>
            </section>
          </div>

          {/* Actions — stays put while the reading column scrolls */}
          <div className="flex flex-col gap-3 md:pt-1 md:sticky md:top-24 md:self-start">
            <a
              href={directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary w-full py-4 text-sm"
            >
              <Navigation size={16} aria-hidden />
              Get directions
            </a>

            <button onClick={shareResult} className="btn btn-secondary w-full py-4 text-sm">
              <Share2 size={16} aria-hidden />
              {copied ? 'Link copied!' : 'Share result'}
            </button>

            <Link
              to="/party/$partyId/explore"
              params={{ partyId }}
              className="btn btn-ghost w-full py-3 text-sm"
            >
              <Compass size={15} aria-hidden />
              Explore alternatives
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
