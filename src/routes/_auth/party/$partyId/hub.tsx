import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '#/features/auth'
import { getPartyLobby } from '#/features/parties'
import { getLeaderPrefsContext, submitPreferences, CUISINES, BUDGETS, DIETARY } from '#/features/preferences'
import { PartyProgressBar } from '#/features/parties'
import { findRestaurant } from '#/features/recommendations'
import { supabase } from '#/lib/supabase'
import type { Tables } from '#/types/database'

type LobbyData = {
  party: Tables<'parties'>
  members: Tables<'party_members'>[]
  isCreator: boolean
  leaderHasSubmitted: boolean
  memberHasSubmitted: boolean
}

export const Route = createFileRoute('/_auth/party/$partyId/hub')({ component: PartyHub })

const BUDGET_SYMBOL: Record<number, string> = { 1: '$', 2: '$$', 3: '$$$', 4: '$$$$' }
const FIRST_N = 12

function PartyHub() {
  const { partyId } = Route.useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [lobbyData, setLobbyData] = useState<LobbyData | null>(null)
  const [cuisineBlacklist, setCuisineBlacklist] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  // Taste zone form state (local until saved)
  const [tasteEditing, setTasteEditing] = useState(false)
  const [cuisineWants, setCuisineWants] = useState<string[]>([])
  const [budget, setBudget] = useState<number | null>(null)
  const [dietary, setDietary] = useState<string[]>([])
  const [showAllCuisines, setShowAllCuisines] = useState(false)
  const [submittingTaste, setSubmittingTaste] = useState(false)
  const [tasteError, setTasteError] = useState<string | null>(null)

  const [copied, setCopied] = useState(false)
  const [view, setView] = useState<'hub' | 'ready'>('hub')
  const [finding, setFinding] = useState(false)
  const [findError, setFindError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!user) return
    try {
      const [result, prefs] = await Promise.all([
        getPartyLobby({ data: { partyId, userId: user.id } }),
        getLeaderPrefsContext({ data: { userId: user.id } }),
      ])
      setLobbyData(result)
      setCuisineBlacklist(prefs.profileCuisineBlacklist)
      if (result.party.status === 'resolved') {
        navigate({ to: '/party/$partyId/result', params: { partyId } })
      }
    } catch {
      // handled by null data state
    } finally {
      setLoading(false)
    }
  }, [partyId, user, navigate])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!user) return
    const channel = supabase
      .channel(`lobby:${partyId}`)
      .on('broadcast', { event: 'member_updated' }, () => load())
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'parties' },
        (payload) => {
          const updated = payload.new as { id?: string; status?: string }
          if (updated.id !== partyId) return
          if (updated.status === 'voting') {
            navigate({ to: '/party/$partyId/vote', params: { partyId } })
          } else if (updated.status === 'resolved') {
            navigate({ to: '/party/$partyId/result', params: { partyId } })
          } else {
            load()
          }
        },
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [partyId, user, load, navigate])

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: 'var(--color-surface-deep)' }}>
        <header className="flex items-center gap-4 px-6 py-5">
          <div className="h-4 w-12 rounded animate-pulse" style={{ background: 'var(--color-surface-petrol)' }} />
        </header>
        <main className="flex-1 px-6 py-4 max-w-lg mx-auto w-full flex flex-col gap-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-2xl animate-pulse" style={{ background: 'var(--color-surface-petrol)' }} />
          ))}
        </main>
      </div>
    )
  }

  if (!lobbyData) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-surface-deep)' }}>
        <p style={{ color: 'var(--color-text-mist)' }}>Party not found.</p>
      </div>
    )
  }

  const { party, members, leaderHasSubmitted, isCreator } = lobbyData
  const inviteLink = party.invite_token
    ? `${window.location.origin}/invite/${party.invite_token}`
    : null

  const inviteZoneDone = members.length > 0
  const tasteDone = leaderHasSubmitted && !tasteEditing
  const ctaEnabled = tasteDone

  const ctaLabel = finding
    ? 'Finding…'
    : ctaEnabled
    ? 'Find a restaurant.'
    : 'Set your taste first'

  // Cuisine display: first N + any selected outside the first N
  const available = CUISINES.filter((c) => !cuisineBlacklist.includes(c))
  const baseSet = available.slice(0, FIRST_N)
  const selectedTail = cuisineWants.filter((c) => !baseSet.includes(c))
  const visibleCuisines = showAllCuisines ? available : [...baseSet, ...selectedTail]
  const hiddenCount = available.length - visibleCuisines.length

  // Taste summary for collapsed zone
  const tasteSummaryParts: string[] = []
  if (cuisineWants.length > 0) {
    tasteSummaryParts.push(
      cuisineWants.slice(0, 2).join(', ') + (cuisineWants.length > 2 ? ` +${cuisineWants.length - 2}` : ''),
    )
  } else {
    tasteSummaryParts.push('Open to anything')
  }
  if (budget) tasteSummaryParts.push(BUDGET_SYMBOL[budget])
  if (dietary.length > 0) tasteSummaryParts.push(dietary.slice(0, 2).join(', '))

  async function copyLink() {
    if (!inviteLink) return
    await navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }

  async function shareLink() {
    if (!inviteLink) return
    const text = `Join my Bond party! Add your preferences here: ${inviteLink}`
    if (navigator.share) {
      await navigator.share({ title: 'Bond', text, url: inviteLink })
    } else {
      window.open(`sms:&body=${encodeURIComponent(text)}`)
    }
  }

  async function saveTaste() {
    if (!user || budget === null) return
    setSubmittingTaste(true)
    setTasteError(null)
    try {
      await submitPreferences({
        data: { partyId, userId: user.id, cuisineWants, budgetTier: budget, dietaryRestrictions: dietary },
      })
      setTasteEditing(false)
      await load()
    } catch {
      setTasteError('Something went wrong. Try again.')
    } finally {
      setSubmittingTaste(false)
    }
  }

  async function handleFindRestaurant() {
    if (finding) return
    setFinding(true)
    setFindError(null)
    try {
      await findRestaurant({ data: { partyId } })
      navigate({ to: '/party/$partyId/vote', params: { partyId } })
    } catch (err) {
      setFindError(err instanceof Error ? err.message : 'Something went wrong.')
      setFinding(false)
    }
  }

  // ── Party Ready view ────────────────────────────────────────────────────────
  if (view === 'ready') {
    const readyCount = members.filter((m) => m.preferences_submitted_at).length
    return (
      <div
        className="min-h-screen flex flex-col px-5.5 py-10"
        style={{ background: 'var(--color-accent-ember)', color: '#fff' }}
      >
        <div className="flex-1 flex flex-col items-center justify-center gap-8 max-w-sm mx-auto w-full text-center">
          {party.name && (
            <p className="text-[10px] font-black uppercase tracking-[.14em]" style={{ opacity: 0.75 }}>
              {party.name}
            </p>
          )}

          <div className="flex flex-col gap-3">
            <h1
              className="font-display font-black leading-none"
              style={{ fontSize: 44, letterSpacing: '-0.02em' }}
            >
              Everyone's in.
            </h1>
            <p className="text-base" style={{ opacity: 0.8 }}>
              You're all set. Bond is picking your spot.
            </p>
          </div>

          {members.length > 0 && (
            <div className="flex items-center justify-center">
              {members.slice(0, 6).map((m, i) => (
                <div
                  key={m.id}
                  className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold border-2 border-white"
                  style={{
                    background: 'rgba(255,255,255,0.25)',
                    color: '#fff',
                    marginLeft: i === 0 ? 0 : -10,
                    zIndex: members.length - i,
                    position: 'relative',
                  }}
                >
                  {(m.guest_name ?? '?')[0].toUpperCase()}
                </div>
              ))}
            </div>
          )}

          <div
            className="w-full px-4 py-3 rounded-2xl text-left"
            style={{ background: 'rgba(255,255,255,0.18)' }}
          >
            <p className="text-[10px] font-black uppercase tracking-[.12em] mb-1" style={{ opacity: 0.7 }}>
              Crew
            </p>
            <p className="text-sm font-semibold">
              {readyCount} of {members.length} ready
            </p>
          </div>
        </div>

        <div className="shrink-0 max-w-sm mx-auto w-full pt-8 flex flex-col gap-3">
          <button
            onClick={handleFindRestaurant}
            disabled={finding}
            className="w-full py-4 rounded-2xl font-bold text-base transition-opacity disabled:opacity-60"
            style={{ background: '#fff', color: 'var(--color-accent-ember)' }}
          >
            {finding ? 'Finding…' : 'Find our spot →'}
          </button>
          <button
            onClick={() => setView('hub')}
            className="w-full py-3 text-sm font-semibold"
            style={{ color: 'rgba(255,255,255,0.7)' }}
          >
            ← Go back
          </button>
          {findError && (
            <p className="text-sm text-center" style={{ opacity: 0.8 }}>{findError}</p>
          )}
        </div>
      </div>
    )
  }

  // ── Main Hub view ───────────────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'var(--color-surface-deep)', color: 'var(--color-text-cream)' }}
    >
      <header className="flex flex-col px-6 pt-5 pb-3 shrink-0">
        <div className="flex items-center gap-4">
          <Link
            to="/home"
            className="text-sm font-semibold transition-opacity hover:opacity-70"
            style={{ color: 'var(--color-text-mist)' }}
          >
            ← Back
          </Link>
          <span className="font-display text-xl font-semibold" style={{ color: 'var(--color-accent-ember)' }}>
            Bond
          </span>
        </div>
        <PartyProgressBar step={2} />
      </header>

      <main className="flex-1 overflow-y-auto px-5.5 max-w-lg mx-auto w-full pb-52 flex flex-col gap-4">

        {/* ── Identity zone ──────────────────────────────────────── */}
        <div className="pt-2 flex flex-col gap-2">
          <h1
            className="font-display font-black leading-none"
            style={{ fontSize: 25, letterSpacing: '-0.02em', color: 'var(--color-text-cream)' }}
          >
            {party.name ?? 'Your party'}
          </h1>
          {party.location && (
            <span
              className="self-start text-xs font-semibold px-3 py-1.5 rounded-full"
              style={{
                background: 'var(--color-surface-petrol)',
                border: '1.5px solid var(--color-accent-ember)',
                color: 'var(--color-text-cream)',
              }}
            >
              ◉ {party.location}
            </span>
          )}
        </div>

        {/* ── Invite zone ────────────────────────────────────────── */}
        {!inviteZoneDone ? (
          <div
            className="flex flex-col gap-3 px-4 py-4 rounded-2xl"
            style={{ background: 'var(--color-surface-petrol)', border: '1px solid var(--color-hairline)' }}
          >
            <p className="text-[10px] font-black uppercase tracking-[.12em]" style={{ color: 'var(--color-text-mist)' }}>
              Invite the crew
            </p>
            {inviteLink && (
              <>
                <div
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                  style={{ background: 'var(--color-surface-twilight)', border: '1px solid var(--color-hairline)' }}
                >
                  <span className="flex-1 text-xs truncate" style={{ color: 'var(--color-text-mist)' }}>
                    {inviteLink}
                  </span>
                  <button
                    onClick={copyLink}
                    className="shrink-0 text-xs font-bold px-3 py-1.5 rounded-[10px] transition-opacity hover:opacity-80"
                    style={{
                      background: copied ? 'var(--color-surface-twilight)' : 'var(--color-accent-ember)',
                      color: copied ? 'var(--color-text-mist)' : 'var(--color-on-ember)',
                      border: copied ? '1px solid var(--color-hairline)' : 'none',
                    }}
                  >
                    {copied ? 'Copied!' : 'Copy link'}
                  </button>
                </div>
                <p className="text-xs" style={{ color: 'var(--color-text-mist)' }}>
                  Anyone with this link can join and add their preferences.
                </p>
                <button
                  onClick={shareLink}
                  className="py-2.5 rounded-xl text-sm font-semibold text-center transition-opacity hover:opacity-80"
                  style={{
                    background: 'var(--color-surface-twilight)',
                    color: 'var(--color-text-cream)',
                    border: '1px solid var(--color-hairline)',
                  }}
                >
                  Share
                </button>
              </>
            )}
          </div>
        ) : (
          <>
            {/* Collapsed invite row */}
            <div
              className="flex items-center gap-3 px-4 py-3 rounded-2xl"
              style={{ background: 'var(--color-surface-petrol)', border: '1px solid var(--color-hairline)' }}
            >
              <div className="flex items-center shrink-0">
                {members.slice(0, 4).map((m, i) => (
                  <div
                    key={m.id}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{
                      background: 'var(--color-surface-twilight)',
                      border: '2px solid var(--color-surface-petrol)',
                      color: 'var(--color-text-mist)',
                      marginLeft: i === 0 ? 0 : -8,
                      position: 'relative',
                      zIndex: members.length - i,
                    }}
                  >
                    {(m.guest_name ?? '?')[0].toUpperCase()}
                  </div>
                ))}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold" style={{ color: 'var(--color-text-cream)' }}>
                  {members.length} in the crew
                </p>
                <p className="text-xs" style={{ color: 'var(--color-text-mist)' }}>
                  {members.filter((m) => m.preferences_submitted_at).length} of {members.length} ready
                </p>
              </div>
              {inviteLink && (
                <button
                  onClick={shareLink}
                  className="shrink-0 text-xs font-bold px-3 py-1.5 rounded-full"
                  style={{
                    background: 'var(--color-surface-twilight)',
                    color: 'var(--color-accent-ember)',
                    border: '1px solid var(--color-hairline)',
                  }}
                >
                  Share +
                </button>
              )}
            </div>

            {/* Crew status list */}
            <div className="flex flex-col gap-1.5">
              <p className="text-[10px] font-black uppercase tracking-[.12em] px-1" style={{ color: 'var(--color-text-mist)' }}>
                Crew status
              </p>
              {/* Leader row — always first */}
              {isCreator && (
                <div
                  className="flex items-center justify-between px-4 py-2.5 rounded-xl"
                  style={{ background: 'var(--color-surface-petrol)' }}
                >
                  <span className="flex items-center gap-1.5 text-sm font-medium" style={{ color: 'var(--color-text-cream)' }}>
                    You
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{ background: 'var(--color-accent-ember)', color: 'var(--color-on-ember)' }}
                    >
                      host
                    </span>
                  </span>
                  <span
                    className="flex items-center gap-1.5 text-xs font-semibold"
                    style={{ color: leaderHasSubmitted ? 'var(--color-accent-gold)' : 'var(--color-text-mist)' }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{
                        background: leaderHasSubmitted ? 'var(--color-accent-gold)' : 'var(--color-text-mist)',
                        opacity: leaderHasSubmitted ? 1 : 0.4,
                      }}
                    />
                    {leaderHasSubmitted ? 'Ready' : 'Waiting'}
                  </span>
                </div>
              )}
              {members.map((m) => {
                const ready = !!m.preferences_submitted_at
                return (
                  <div
                    key={m.id}
                    className="flex items-center justify-between px-4 py-2.5 rounded-xl"
                    style={{ background: 'var(--color-surface-petrol)' }}
                  >
                    <span className="text-sm font-medium" style={{ color: 'var(--color-text-cream)' }}>
                      {m.guest_name ?? '—'}
                    </span>
                    <span
                      className="flex items-center gap-1.5 text-xs font-semibold"
                      style={{ color: ready ? 'var(--color-accent-gold)' : 'var(--color-text-mist)' }}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{
                          background: ready ? 'var(--color-accent-gold)' : 'var(--color-text-mist)',
                          opacity: ready ? 1 : 0.4,
                        }}
                      />
                      {ready ? 'Ready' : 'Waiting'}
                    </span>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* ── Taste zone ─────────────────────────────────────────── */}
        {tasteDone ? (
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-2xl"
            style={{ background: 'var(--color-surface-petrol)', border: '1px solid var(--color-hairline)' }}
          >
            <span style={{ color: 'var(--color-accent-gold)' }}>✓</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold" style={{ color: 'var(--color-text-cream)' }}>Your taste</p>
              <p className="text-xs truncate" style={{ color: 'var(--color-text-mist)' }}>
                {tasteSummaryParts.join(' · ')}
              </p>
            </div>
            <button
              onClick={() => setTasteEditing(true)}
              className="shrink-0 text-xs font-semibold transition-opacity hover:opacity-70"
              style={{ color: 'var(--color-text-mist)' }}
            >
              ✎ Edit
            </button>
          </div>
        ) : (
          <div
            className="flex flex-col gap-4 px-4 py-4 rounded-2xl"
            style={{ background: 'var(--color-surface-petrol)', border: '1.5px solid var(--color-accent-ember)' }}
          >
            <p className="text-[10px] font-black uppercase tracking-[.12em]" style={{ color: 'var(--color-text-mist)' }}>
              Your taste
            </p>

            {/* Cuisine chips */}
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold" style={{ color: 'var(--color-text-cream)' }}>
                In the mood for?
              </p>
              <div className="flex flex-wrap gap-2">
                {visibleCuisines.map((c) => {
                  const sel = cuisineWants.includes(c)
                  return (
                    <button
                      key={c}
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
                    onClick={() => setShowAllCuisines(true)}
                    className="px-3 py-1.5 rounded-full text-xs font-medium"
                    style={{
                      border: '1.5px dashed var(--color-hairline)',
                      color: 'var(--color-text-mist)',
                      background: 'transparent',
                    }}
                  >
                    + {hiddenCount} more
                  </button>
                )}
                {showAllCuisines && (
                  <button
                    onClick={() => setShowAllCuisines(false)}
                    className="px-3 py-1.5 rounded-full text-xs font-medium"
                    style={{
                      border: '1.5px dashed var(--color-hairline)',
                      color: 'var(--color-text-mist)',
                      background: 'transparent',
                    }}
                  >
                    Show less
                  </button>
                )}
              </div>
            </div>

            {/* Budget bar */}
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold" style={{ color: 'var(--color-text-cream)' }}>Budget</p>
              <div className="flex gap-2">
                {BUDGETS.map(({ tier, symbol }: { tier: number; symbol: string; label: string; sub: string }) => {
                  const active = budget === tier
                  return (
                    <button
                      key={tier}
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
              <p className="text-xs font-semibold" style={{ color: 'var(--color-text-cream)' }}>
                Dietary{' '}
                <span style={{ color: 'var(--color-text-mist)', fontWeight: 400 }}>· optional</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {DIETARY.map((d) => {
                  const active = dietary.includes(d)
                  return (
                    <button
                      key={d}
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

            {tasteError && (
              <p className="text-xs" style={{ color: 'var(--color-accent-brick)' }}>{tasteError}</p>
            )}

            <button
              onClick={saveTaste}
              disabled={budget === null || submittingTaste}
              className="w-full py-3 rounded-2xl font-semibold text-sm transition-opacity"
              style={{
                background: budget !== null ? 'var(--color-accent-ember)' : '#D9CDBA',
                color: budget !== null ? 'var(--color-on-ember)' : '#A09485',
                cursor: budget !== null && !submittingTaste ? 'pointer' : 'not-allowed',
              }}
            >
              {submittingTaste ? 'Saving…' : 'Save my taste'}
            </button>
          </div>
        )}
      </main>

      {/* ── Pinned CTA ────────────────────────────────────────────── */}
      <div
        className="fixed bottom-0 left-0 right-0 px-5.5 pb-8 pt-6"
        style={{ background: 'linear-gradient(to top, var(--color-surface-deep) 75%, transparent)' }}
      >
        <div className="max-w-lg mx-auto flex flex-col gap-3">
          {/* Hint — only shown when CTA is locked */}
          {!ctaEnabled && (
            <p className="text-xs font-semibold mb-1" style={{ color: 'var(--color-text-mist)' }}>
              Set your taste above to unlock this.
            </p>
          )}

          <button
            onClick={() => ctaEnabled && !finding && setView('ready')}
            disabled={!ctaEnabled || finding}
            className="w-full py-4 rounded-2xl font-bold text-base transition-all"
            style={{
              background: ctaEnabled ? 'var(--color-accent-ember)' : '#D9CDBA',
              color: ctaEnabled ? 'var(--color-on-ember)' : '#A09485',
              cursor: ctaEnabled && !finding ? 'pointer' : 'not-allowed',
            }}
          >
            {ctaLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
