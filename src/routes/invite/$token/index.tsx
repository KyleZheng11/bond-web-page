import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState, useEffect, useCallback } from 'react'
import { motion } from 'motion/react'
import { Check, Star, Navigation, Share2, Pencil } from 'lucide-react'
import { resolveInvite, submitGuestPreferences, getGuestPartyMembers } from '#/features/invites'
import { getRecommendation } from '#/features/recommendations'
import { CUISINES, BUDGETS, DIETARY } from '#/features/preferences'
import { supabase } from '#/lib/supabase'
import type { Place } from '#/features/recommendations'
import type { Tables } from '#/types/database'
import { Wordmark, Spinner } from '#/components/ui'

export const Route = createFileRoute('/invite/$token/')({ component: GuestHub })

type InviteData = Awaited<ReturnType<typeof resolveInvite>>
type GuestView = 'hub' | 'waiting' | 'result'
type LobbyMember = { id: string; guest_name: string | null; preferences_submitted_at: string | null }

function ReadyDot({ ready }: { ready: boolean }) {
  return (
    <span
      className="flex items-center gap-1.5 text-xs font-semibold"
      style={{ color: ready ? 'var(--color-success)' : 'var(--color-ink-faint)' }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ background: ready ? 'var(--color-success)' : 'var(--color-ink-faint)' }}
      />
      {ready ? 'Ready' : 'Waiting'}
    </span>
  )
}

const PRICE_SYMBOL: Record<string, string> = {
  PRICE_LEVEL_INEXPENSIVE: 'Under $15',
  PRICE_LEVEL_MODERATE: '$15–$30',
  PRICE_LEVEL_EXPENSIVE: '$30–$60',
  PRICE_LEVEL_VERY_EXPENSIVE: '$60+',
}
const FIRST_N = 12

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

  // Guest lobby state (shown while waiting for the leader to lock the spot)
  const [lobbyMembers, setLobbyMembers] = useState<LobbyMember[]>([])
  const [lobbyInviteToken, setLobbyInviteToken] = useState<string | null>(null)

  const loadLobby = useCallback(async () => {
    if (!personalToken) return
    try {
      const result = await getGuestPartyMembers({ data: { token: personalToken } })
      setLobbyMembers(result.members)
      setLobbyInviteToken(result.party.invite_token)
    } catch {
      // keep whatever we last had — the confirmation banner still works without the live list
    }
  }, [personalToken])

  useEffect(() => {
    if (guestView === 'waiting') loadLobby()
  }, [guestView, loadLobby])

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
      .channel(`lobby:${partyId}`)
      .on('broadcast', { event: 'member_updated' }, () => loadLobby())
      .on('broadcast', { event: 'voting_started' }, () => {
        navigate({ to: '/invite/$token/vote', params: { token: personalToken } })
      })
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
  }, [partyId, guestView, personalToken, navigate, loadLobby])

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

  async function copyLobbyLink() {
    if (!lobbyInviteToken) return
    await navigator.clipboard.writeText(`${window.location.origin}/invite/${lobbyInviteToken}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }

  async function shareLobbyLink() {
    if (!lobbyInviteToken) return
    const link = `${window.location.origin}/invite/${lobbyInviteToken}`
    const text = `Join my Bond party! Add your preferences here: ${link}`
    if (navigator.share) {
      await navigator.share({ title: 'Bond', text, url: link })
    } else {
      window.open(`sms:&body=${encodeURIComponent(text)}`)
    }
  }

  // Cuisine display logic
  const baseSet = CUISINES.slice(0, FIRST_N)
  const selectedTail = cuisineWants.filter((c) => !baseSet.includes(c))
  const visibleCuisines = showAllCuisines ? CUISINES : [...baseSet, ...selectedTail]
  const hiddenCount = CUISINES.length - visibleCuisines.length

  const canSubmit = name.trim().length > 0 && cuisineWants.length > 0 && budget !== null

  // Taste summary for the lobby's collapsed "Your taste" card — same
  // pattern as the leader's hub.
  const tasteSummaryParts: string[] = []
  if (cuisineWants.length > 0) {
    tasteSummaryParts.push(
      cuisineWants.slice(0, 2).join(', ') + (cuisineWants.length > 2 ? ` +${cuisineWants.length - 2}` : ''),
    )
  } else {
    tasteSummaryParts.push('Open to anything')
  }
  const budgetSymbol = BUDGETS.find((b: { tier: number; symbol: string }) => b.tier === budget)?.symbol
  if (budgetSymbol) tasteSummaryParts.push(budgetSymbol)

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (loadingInvite) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-6 px-6">
        <Spinner size={40} />
      </div>
    )
  }

  // ── Error ───────────────────────────────────────────────────────────────────
  if (loadError || !invite) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-4 px-6 text-center">
        <Wordmark className="text-4xl" />
        <h1 className="display text-2xl mt-4">This link isn't working.</h1>
        <p className="text-sm max-w-xs" style={{ color: 'var(--color-ink-soft)' }}>
          {loadError || 'The invite link is invalid or has been removed. Ask your group leader for a new one.'}
        </p>
      </div>
    )
  }

  // ── Result view ─────────────────────────────────────────────────────────────
  if (guestView === 'result') {
    if (!rec) {
      return (
        <div className="dawn-sky min-h-dvh flex flex-col items-center justify-center px-6 text-center">
          <div className="dawn-sun dawn-sun-rise" aria-hidden />
          <div className="dawn-horizon" aria-hidden />
          <div className="relative z-10 flex flex-col items-center gap-6 text-on-dawn">
            <Spinner size={48} dark />
            <h1 className="font-display text-2xl font-bold" style={{ color: '#ffffff', letterSpacing: '-0.02em' }}>
              Loading result…
            </h1>
          </div>
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
      <div className="min-h-dvh flex flex-col">
        <div className="max-w-285 mx-auto w-full">
          <header className="px-6 py-4">
            <Wordmark className="text-xl" />
          </header>

          <div className="mx-6 mt-2 h-72 md:h-[56vh] md:max-h-125 relative rounded-[20px] overflow-hidden flex items-start px-4 pt-4">
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

        <main className="flex-1 px-6 pb-10 max-w-285 mx-auto w-full pt-6">
          <div className="max-w-2xl md:max-w-none mx-auto grid md:grid-cols-[1fr_21rem] gap-8 md:gap-14 lg:gap-20">

            <div className="flex flex-col gap-6 min-w-0">
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
                    <span className="text-xs" style={{ color: 'var(--color-ink-soft)' }}>{place.address}</span>
                  </>
                )}
              </div>

              <section className="flex flex-col gap-2 max-w-xl">
                <p className="eyebrow">Why Bond picked this</p>
                <p className="text-sm leading-relaxed">{rec.reason}</p>
              </section>
            </div>

            {/* Actions — stays put while the reading column scrolls */}
            <div className="flex flex-col gap-3 md:pt-1 md:sticky md:top-24 md:self-start">
              <a href={directionsUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary w-full py-4 text-sm">
                <Navigation size={16} aria-hidden />
                Get directions
              </a>
              <button onClick={shareResult} className="btn btn-secondary w-full py-4 text-sm">
                <Share2 size={16} aria-hidden />
                {copied ? 'Link copied!' : 'Share result'}
              </button>
            </div>
          </div>
        </main>
      </div>
    )
  }

  // ── Waiting / guest lobby view ─────────────────────────────────────────────
  if (guestView === 'waiting') {
    return (
      <div className="min-h-dvh flex flex-col">
        <header className="max-w-lg mx-auto w-full px-6 py-4">
          <Wordmark className="text-xl" />
        </header>

        <motion.main
          className="flex-1 px-6 pb-10 max-w-lg mx-auto w-full flex flex-col gap-4"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        >
          {/* Confirmation banner */}
          <div className="glass flex flex-col gap-3 px-5 py-5">
            <span
              className="w-11 h-11 rounded-full flex items-center justify-center shrink-0"
              style={{ background: 'var(--color-success-soft)', color: 'var(--color-success)' }}
            >
              <Check size={22} aria-hidden />
            </span>
            <div className="flex flex-col gap-1">
              <p className="font-display font-bold text-xl leading-tight">You're in!</p>
              <p className="text-sm" style={{ color: 'var(--color-ink-soft)' }}>
                {leaderName
                  ? `Waiting for ${leaderName} to lock the spot.`
                  : 'Waiting for the leader to lock the spot.'}
              </p>
            </div>
          </div>

          {/* Invite more people */}
          {lobbyInviteToken && (
            <div className="glass flex flex-col gap-3 px-5 py-5">
              <p className="eyebrow">Invite more people</p>
              <div
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                style={{ background: 'var(--color-surface-dim)', border: '1px solid var(--color-line)' }}
              >
                <span className="flex-1 text-xs truncate" style={{ color: 'var(--color-ink-soft)' }}>
                  {`${window.location.origin}/invite/${lobbyInviteToken}`}
                </span>
                <button
                  onClick={copyLobbyLink}
                  className="shrink-0 text-xs font-bold px-3 py-1.5 rounded-full cursor-pointer transition-opacity hover:opacity-85"
                  style={
                    copied
                      ? { background: 'var(--color-success-soft)', color: 'var(--color-success)' }
                      : { background: 'var(--color-deep)', color: '#ffffff' }
                  }
                >
                  {copied ? 'Copied!' : 'Copy link'}
                </button>
              </div>
              <button onClick={shareLobbyLink} className="btn btn-secondary !rounded-xl py-2.5 text-sm">
                Share
              </button>
            </div>
          )}

          {/* Crew status */}
          {lobbyMembers.length > 0 && (
            <div className="glass flex flex-col px-1 py-1">
              <p className="eyebrow px-4 pt-3 pb-1">Crew status</p>
              {lobbyMembers.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between px-4 py-2.5 border-t"
                  style={{ borderColor: 'var(--color-line)' }}
                >
                  <span className="text-sm font-medium">{m.guest_name ?? '—'}</span>
                  <ReadyDot ready={!!m.preferences_submitted_at} />
                </div>
              ))}
            </div>
          )}

          {/* Your taste — same collapsed-card pattern as the leader's hub */}
          <div className="glass flex items-center gap-3 px-4 py-3">
            <span
              className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
              style={{ background: 'var(--color-success-soft)', color: 'var(--color-success)' }}
            >
              <Check size={15} aria-hidden />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">Your taste</p>
              <p className="text-xs truncate" style={{ color: 'var(--color-ink-soft)' }}>
                {tasteSummaryParts.join(' · ')}
              </p>
            </div>
            <button
              onClick={() => setGuestView('hub')}
              className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold cursor-pointer transition-opacity hover:opacity-70"
              style={{ color: 'var(--color-ink-soft)' }}
            >
              <Pencil size={12} aria-hidden />
              Edit
            </button>
          </div>

          {/* Save preferences nudge */}
          <Link to="/signup" search={{ returnTo: `/invite/${token}` }} className="btn btn-accent w-full py-4 text-sm">
            Save your preferences
          </Link>

          <p className="text-xs text-center" style={{ color: 'var(--color-ink-soft)' }}>
            Your preferences are private — no one else in your party will see them.
          </p>
        </motion.main>
      </div>
    )
  }

  // ── Hub view (default) ──────────────────────────────────────────────────────
  const partyName = invite.party.name
  const memberLabel = invite.memberCount === 1 ? '1 person joining' : `${invite.memberCount} people joining`

  return (
    <div className="min-h-dvh flex flex-col">
      <header className="max-w-lg mx-auto w-full px-6 py-4">
        <Wordmark className="text-xl" />
      </header>

      <form onSubmit={handleSubmit} className="flex-1 px-6 pb-10 max-w-lg mx-auto w-full flex flex-col gap-5">
        {/* Intro */}
        <div className="flex flex-col gap-1 pt-1">
          <p className="eyebrow">{leaderName ? `${leaderName} invited you` : "You've been invited"}</p>
          <h1 className="font-display font-bold leading-tight text-2xl" style={{ letterSpacing: '-0.02em' }}>
            {partyName ?? 'Join the party'}
          </h1>
          {invite.memberCount > 0 && (
            <p className="text-sm" style={{ color: 'var(--color-ink-soft)' }}>
              {memberLabel}
            </p>
          )}
        </div>

        {/* Name field */}
        <div className="glass flex flex-col gap-3 px-5 py-5">
          <label htmlFor="guest-name" className="eyebrow">Your name</label>
          <input
            id="guest-name"
            type="text"
            placeholder="What should we call you?"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            className="input"
          />
        </div>

        {/* Taste zone */}
        <div className="glass flex flex-col gap-4 px-5 py-5" style={{ borderColor: 'var(--color-bond)', borderWidth: '1.5px' }}>
          <p className="eyebrow">Your taste</p>

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
                    aria-pressed={sel}
                    className={`chip-glass ${sel ? 'chip-glass-active' : ''}`}
                  >
                    {c}
                  </button>
                )
              })}
              {hiddenCount > 0 && (
                <button
                  type="button"
                  onClick={() => setShowAllCuisines(true)}
                  className="chip-glass"
                  style={{ borderStyle: 'dashed', color: 'var(--color-ink-soft)', background: 'transparent' }}
                >
                  + {hiddenCount} more
                </button>
              )}
              {showAllCuisines && (
                <button
                  type="button"
                  onClick={() => setShowAllCuisines(false)}
                  className="chip-glass"
                  style={{ borderStyle: 'dashed', color: 'var(--color-ink-soft)', background: 'transparent' }}
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
              {BUDGETS.map(({ tier, symbol }: { tier: number; symbol: string; sub: string }) => {
                const active = budget === tier
                return (
                  <button
                    key={tier}
                    type="button"
                    onClick={() => setBudget(tier)}
                    aria-pressed={active}
                    className={`chip-glass flex-1 justify-center !rounded-xl font-bold ${active ? 'chip-glass-active' : ''}`}
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
              Dietary <span style={{ color: 'var(--color-ink-soft)', fontWeight: 400 }}>· optional</span>
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
                    aria-pressed={active}
                    className={`chip-glass ${active ? 'chip-glass-active' : ''}`}
                  >
                    {d}
                  </button>
                )
              })}
            </div>
            <p className="text-xs" style={{ color: 'var(--color-ink-soft)' }}>
              Never shown to anyone else in your party.
            </p>
          </div>
        </div>

        {submitError && (
          <p role="alert" className="text-sm" style={{ color: 'var(--color-error)' }}>{submitError}</p>
        )}

        <button type="submit" disabled={!canSubmit || submitting} className="btn btn-primary w-full py-4 text-base">
          {submitting ? 'Saving…' : "I'm ready"}
        </button>

        <p className="text-xs text-center" style={{ color: 'var(--color-ink-soft)' }}>
          No account needed. Your preferences are private.
        </p>
      </form>
    </div>
  )
}
