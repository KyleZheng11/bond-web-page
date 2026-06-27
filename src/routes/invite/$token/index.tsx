import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import { resolveInvite, submitGuestPreferences } from '#/features/invites'
import { getRecommendation } from '#/features/recommendations'
import { CUISINES, BUDGETS, DIETARY } from '#/features/preferences'
import { supabase } from '#/lib/supabase'
import type { Place } from '#/features/recommendations'
import type { Tables } from '#/types/database'

export const Route = createFileRoute('/invite/$token/')({ component: GuestHub })

type InviteData = Awaited<ReturnType<typeof resolveInvite>>
type GuestView = 'hub' | 'waiting' | 'result'

const PRICE_SYMBOL: Record<string, string> = {
  PRICE_LEVEL_INEXPENSIVE: '$',
  PRICE_LEVEL_MODERATE: '$$',
  PRICE_LEVEL_EXPENSIVE: '$$$',
  PRICE_LEVEL_VERY_EXPENSIVE: '$$$$',
}
const FIRST_N = 8

function formatCuisineTag(type: string): string {
  return type
    .replace('_restaurant', '')
    .replace('_shop', '')
    .replace('_house', ' house')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function GuestHub() {
  const { token } = Route.useParams()
  const navigate = useNavigate()

  const [loadingInvite, setLoadingInvite] = useState(true)
  const [invite, setInvite] = useState<InviteData | null>(null)
  const [loadError, setLoadError] = useState('')

  // View state
  const [guestView, setGuestView] = useState<GuestView>('hub')
  const [partyId, setPartyId] = useState<string | null>(null)
  const [leaderName, setLeaderName] = useState<string | null>(null)
  // personalToken: the per-member guest_token used as voterId.
  // For SMS invites this equals the URL token. For general-link guests it's
  // the unique UUID returned by submitGuestPreferences.
  const [personalToken, setPersonalToken] = useState(token)

  // Hub form state
  const [name, setName] = useState('')
  const [cuisineWants, setCuisineWants] = useState<string[]>([])
  const [budget, setBudget] = useState<number | null>(null)
  const [dietary, setDietary] = useState<string[]>([])
  const [showAllCuisines, setShowAllCuisines] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  // Result state
  const [rec, setRec] = useState<Tables<'recommendations'> | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    resolveInvite({ data: { token } })
      .then((result) => {
        setInvite(result)
        setPartyId(result.party.id)
        setLeaderName(result.leaderName)

        if (result.party.status === 'resolved') {
          // Party already resolved — load the recommendation and show result
          setGuestView('result')
          getRecommendation({ data: { partyId: result.party.id } })
            .then(setRec)
            .catch(() => {})
        } else if (result.alreadySubmitted) {
          // Guest already submitted — show waiting state
          setGuestView('waiting')
        }
      })
      .catch((err: Error) => setLoadError(err.message))
      .finally(() => setLoadingInvite(false))
  }, [token])

  // Realtime: watch party status while waiting
  useEffect(() => {
    if (!partyId || (guestView !== 'waiting' && guestView !== 'result')) return

    const channel = supabase
      .channel(`waiting:${partyId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'parties' },
        (payload) => {
          const updated = payload.new as { id?: string; status?: string }
          if (updated.id !== partyId) return
          if (updated.status === 'voting') {
            // Navigate using personalToken so each guest has a unique voterId
            navigate({ to: '/invite/$token/vote', params: { token: personalToken } })
          } else if (updated.status === 'resolved') {
            getRecommendation({ data: { partyId } })
              .then((r) => {
                setRec(r)
                setGuestView('result')
              })
              .catch(() => {})
          }
        },
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [partyId, guestView, personalToken, navigate])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || budget === null) return
    setSubmitting(true)
    setSubmitError('')
    try {
      const result = await submitGuestPreferences({
        data: { token, guestName: name.trim(), cuisineWants, budgetTier: budget, dietaryRestrictions: dietary },
      })
      // Broadcast so leader's hub updates in real-time
      const ch = supabase.channel(`lobby:${result.partyId}`)
      await ch.send({ type: 'broadcast', event: 'member_updated', payload: {} })
      supabase.removeChannel(ch)
      setPartyId(result.partyId)
      // For general-link guests, use the unique guestToken returned as our personal token.
      // This ensures each guest gets a unique voterId when the party moves to voting.
      if (result.guestToken) setPersonalToken(result.guestToken)
      setGuestView('waiting')
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      setSubmitting(false)
    }
  }

  function shareResult() {
    if (!partyId) return
    navigator.clipboard.writeText(`${window.location.origin}/party/${partyId}/result`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Cuisine display logic
  const baseSet = CUISINES.slice(0, FIRST_N)
  const selectedTail = cuisineWants.filter((c) => !baseSet.includes(c))
  const visibleCuisines = showAllCuisines ? CUISINES : [...baseSet, ...selectedTail]
  const hiddenCount = CUISINES.length - visibleCuisines.length

  const canSubmit = name.trim().length > 0 && cuisineWants.length > 0 && budget !== null

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (loadingInvite) {
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

  // ── Error ───────────────────────────────────────────────────────────────────
  if (loadError || !invite) {
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
          {loadError || 'The invite link is invalid or has been removed. Ask your group leader for a new one.'}
        </p>
      </div>
    )
  }

  // ── Result view ─────────────────────────────────────────────────────────────
  if (guestView === 'result') {
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
            Loading result…
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

  // ── Waiting view ────────────────────────────────────────────────────────────
  if (guestView === 'waiting') {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-6 text-center"
        style={{ background: 'var(--color-surface-deep)', color: 'var(--color-text-cream)' }}
      >
        <motion.div
          className="flex flex-col items-center gap-6 max-w-xs"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        >
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold"
            style={{ background: '#E6F5EC', color: 'var(--color-accent-gold)' }}
          >
            ✓
          </div>

          <div className="flex flex-col gap-2">
            <h1
              className="font-display text-3xl font-black leading-tight"
              style={{ letterSpacing: '-0.02em' }}
            >
              You're in!
            </h1>
            <p className="text-base" style={{ color: 'var(--color-text-mist)' }}>
              {leaderName
                ? `Waiting for ${leaderName} to lock the spot.`
                : 'Waiting for the leader to lock the spot.'}
            </p>
          </div>

          <div
            className="w-full px-4 py-3 rounded-2xl text-sm"
            style={{ background: 'var(--color-surface-petrol)', color: 'var(--color-text-mist)', border: '1px solid var(--color-hairline)' }}
          >
            Your preferences are private — no one else in your party will see them.
          </div>
        </motion.div>
      </div>
    )
  }

  // ── Hub view (default) ──────────────────────────────────────────────────────
  const partyName = invite.party.name
  const memberLabel = invite.memberCount === 1 ? '1 person joining' : `${invite.memberCount} people joining`

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'var(--color-surface-deep)', color: 'var(--color-text-cream)' }}
    >
      <header className="px-5.5 py-5 flex items-center">
        <span className="font-display text-xl font-semibold" style={{ color: 'var(--color-accent-ember)' }}>
          Bond
        </span>
      </header>

      <form
        onSubmit={handleSubmit}
        className="flex-1 px-5.5 pb-10 max-w-lg mx-auto w-full flex flex-col gap-5"
      >
        {/* Intro */}
        <div className="flex flex-col gap-1 pt-1">
          <p className="text-[10px] font-black uppercase tracking-[.14em]" style={{ color: 'var(--color-text-mist)' }}>
            {leaderName ? `${leaderName} invited you` : "You've been invited"}
          </p>
          <h1
            className="font-display font-black leading-tight"
            style={{ fontSize: 25, letterSpacing: '-0.02em' }}
          >
            {partyName ?? 'Join the party'}
          </h1>
          {invite.memberCount > 0 && (
            <p className="text-sm" style={{ color: 'var(--color-text-mist)' }}>
              {memberLabel}
            </p>
          )}
        </div>

        {/* Name field */}
        <div
          className="flex flex-col gap-3 px-4 py-4 rounded-2xl"
          style={{ background: 'var(--color-surface-petrol)', border: '1px solid var(--color-hairline)' }}
        >
          <p className="text-[10px] font-black uppercase tracking-[.12em]" style={{ color: 'var(--color-text-mist)' }}>
            Your name
          </p>
          <input
            type="text"
            placeholder="What should we call you?"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            className="px-3 py-2.5 rounded-xl text-sm outline-none w-full"
            style={{
              background: 'var(--color-surface-twilight)',
              border: `1.5px solid ${name.trim() ? 'var(--color-accent-ember)' : 'var(--color-hairline)'}`,
              color: 'var(--color-text-cream)',
            }}
          />
        </div>

        {/* Taste zone */}
        <div
          className="flex flex-col gap-4 px-4 py-4 rounded-2xl"
          style={{ background: 'var(--color-surface-petrol)', border: '1.5px solid var(--color-accent-ember)' }}
        >
          <p className="text-[10px] font-black uppercase tracking-[.12em]" style={{ color: 'var(--color-text-mist)' }}>
            Your taste
          </p>

          {/* Cuisine chips */}
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold">In the mood for?</p>
            <div className="flex flex-wrap gap-2">
              {visibleCuisines.map((c) => {
                const sel = cuisineWants.includes(c)
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() =>
                      setCuisineWants((prev) => sel ? prev.filter((x) => x !== c) : [...prev, c])
                    }
                    className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                    style={{
                      background: sel ? 'var(--color-accent-ember)' : 'var(--color-surface-twilight)',
                      color: sel ? 'var(--color-on-ember)' : 'var(--color-text-cream)',
                      border: `1px solid ${sel ? 'transparent' : 'var(--color-hairline)'}`,
                    }}
                  >
                    {c}
                  </button>
                )
              })}
              {hiddenCount > 0 && (
                <button
                  type="button"
                  onClick={() => setShowAllCuisines(true)}
                  className="px-3 py-1.5 rounded-full text-xs font-medium"
                  style={{ border: '1.5px dashed var(--color-hairline)', color: 'var(--color-text-mist)', background: 'transparent' }}
                >
                  + {hiddenCount} more
                </button>
              )}
              {showAllCuisines && (
                <button
                  type="button"
                  onClick={() => setShowAllCuisines(false)}
                  className="px-3 py-1.5 rounded-full text-xs font-medium"
                  style={{ border: '1.5px dashed var(--color-hairline)', color: 'var(--color-text-mist)', background: 'transparent' }}
                >
                  Show less
                </button>
              )}
            </div>
          </div>

          {/* Budget bar */}
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold">Budget</p>
            <div className="flex gap-2">
              {BUDGETS.map(({ tier, symbol }: { tier: number; symbol: string; label: string; sub: string }) => {
                const active = budget === tier
                return (
                  <button
                    key={tier}
                    type="button"
                    onClick={() => setBudget(tier)}
                    className="flex-1 py-2 rounded-xl text-sm font-bold text-center transition-all"
                    style={{
                      background: active ? 'var(--color-accent-ember)' : 'var(--color-surface-twilight)',
                      color: active ? 'var(--color-on-ember)' : 'var(--color-text-cream)',
                      border: `1px solid ${active ? 'transparent' : 'var(--color-hairline)'}`,
                    }}
                  >
                    {symbol}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Dietary chips */}
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold">
              Dietary{' '}
              <span style={{ color: 'var(--color-text-mist)', fontWeight: 400 }}>· optional</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {DIETARY.map((d) => {
                const active = dietary.includes(d)
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() =>
                      setDietary((prev) => active ? prev.filter((x) => x !== d) : [...prev, d])
                    }
                    className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                    style={{
                      background: active ? 'var(--color-accent-ember)' : 'var(--color-surface-twilight)',
                      color: active ? 'var(--color-on-ember)' : 'var(--color-text-cream)',
                      border: `1px solid ${active ? 'transparent' : 'var(--color-hairline)'}`,
                    }}
                  >
                    {d}
                  </button>
                )
              })}
            </div>
            <p className="text-xs" style={{ color: 'var(--color-text-mist)' }}>
              Never shown to anyone else in your party.
            </p>
          </div>
        </div>

        {submitError && (
          <p className="text-sm" style={{ color: 'var(--color-accent-brick)' }}>{submitError}</p>
        )}

        <button
          type="submit"
          disabled={!canSubmit || submitting}
          className="w-full py-4 rounded-2xl font-bold text-base transition-opacity"
          style={{
            background: canSubmit ? 'var(--color-accent-ember)' : '#D9CDBA',
            color: canSubmit ? 'var(--color-on-ember)' : '#A09485',
            cursor: canSubmit && !submitting ? 'pointer' : 'not-allowed',
          }}
        >
          {submitting ? 'Saving…' : "I'm ready"}
        </button>

        <p className="text-xs text-center" style={{ color: 'var(--color-text-mist)' }}>
          No account needed. Your preferences are private.
        </p>
      </form>
    </div>
  )
}
